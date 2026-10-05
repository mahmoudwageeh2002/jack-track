import type { WorkoutActivityProps } from './workout-activity';

export type ActivityRecord = { ownerId: string; sessionId: string; activityId: string };
export type WorkoutActivityInput = {
  ownerId: string | null;
  // Undefined while the account's saved workout is being restored.
  props: WorkoutActivityProps | null | undefined;
  foreground: boolean;
};
type Activity = {
  getId(): string;
  update(props: WorkoutActivityProps, staleDate: Date): Promise<void>;
  end(policy: 'immediate'): Promise<void>;
};
type Dependencies = {
  factory: {
    getInstances(): Activity[];
    start(props: WorkoutActivityProps, url: string, staleDate: Date): Activity;
  };
  read: () => Promise<ActivityRecord | null>;
  write: (record: ActivityRecord | null) => Promise<void>;
  onError: (error: unknown) => void;
};

export function createWorkoutActivitySync({ factory, read, write, onError }: Dependencies) {
  let queue = Promise.resolve();
  let revision = 0;
  let loaded = false;
  let record: ActivityRecord | null = null;
  let lastProps = '';

  return (input: WorkoutActivityInput): Promise<void> => {
    const currentRevision = ++revision;
    queue = queue.then(async () => {
      if (currentRevision !== revision) return;
      if (!loaded) { record = await read(); loaded = true; }
      if (currentRevision !== revision) return;
      const { ownerId, props, foreground } = input;
      const keep = record && record.ownerId === ownerId &&
        (props === undefined || props?.sessionId === record.sessionId);
      const instances = factory.getInstances();
      // Remove activities left by a previous account, session, or interrupted start.
      for (const activity of instances) {
        if (!keep || activity.getId() !== record?.activityId) await activity.end('immediate');
      }
      if (!keep && record) {
        await write(null);
        record = null;
        lastProps = '';
      }
      if (currentRevision !== revision || !ownerId || !props) return;
      const staleDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const serialized = JSON.stringify(props);
      if (record) {
        const activity = instances.find((item) => item.getId() === record?.activityId);
        // Respect dismissal by the user; don't recreate it on every set edit.
        if (activity && serialized !== lastProps) {
          await activity.update(props, staleDate);
          lastProps = serialized;
        }
        return;
      }
      // ActivityKit only permits a local start while the app is in the foreground.
      if (!foreground) return;
      const activity = factory.start(props, 'jacktrack:///workout', staleDate);
      const nextRecord = { ownerId, sessionId: props.sessionId, activityId: activity.getId() };
      try { await write(nextRecord); }
      catch (error) { await activity.end('immediate'); throw error; }
      record = nextRecord;
      lastProps = serialized;
    }).catch(onError);
    return queue;
  };
}
