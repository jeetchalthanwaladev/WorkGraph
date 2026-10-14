const STATUS_COLORS = {
  blue: "#7dd3fc",
  purple: "#c4b5fd",
  amber: "#fcd34d",
  rose: "#fda4af",
  green: "#6ee7b7",
};

export default function TaskStatusPie({ statuses, totalTasks }) {
  let cursor = 0;
  const segments = statuses.map((status) => {
    const size = totalTasks ? (status.count / totalTasks) * 100 : 0;
    const start = cursor;
    cursor += size;
    return {
      ...status,
      start,
      end: cursor,
      percent: totalTasks ? Math.round(size) : 0,
      colorValue: STATUS_COLORS[status.color] ?? "#64748b",
    };
  });
  const gradient = totalTasks
    ? `conic-gradient(${segments.map((segment) => `${segment.colorValue} ${segment.start}% ${segment.end}%`).join(", ")})`
    : "conic-gradient(#26334a 0% 100%)";

  return (
    <article className="panel admin-widget task-pie-widget">
      <div className="panel-heading">
        <div>
          <h2>Task distribution</h2>
          <p>Tasks by current status</p>
        </div>
        <span className="count-badge">{totalTasks}</span>
      </div>
      <div className="task-pie-content">
        <div
          className="task-pie-chart"
          role="img"
          aria-label={`Task status distribution across ${totalTasks} ${totalTasks === 1 ? "task" : "tasks"}`}
          style={{ "--task-pie-gradient": gradient }}
        >
          <div>
            <strong>{totalTasks}</strong>
            <span>{totalTasks === 1 ? "task" : "tasks"}</span>
          </div>
        </div>
        <ul className="task-pie-legend">
          {segments.map((status) => (
            <li key={status.id}>
              <span className="task-pie-label">
                <i style={{ backgroundColor: status.colorValue }} />
                {status.label}
              </span>
              <strong>
                {status.count}
                <small>{status.percent}%</small>
              </strong>
            </li>
          ))}
        </ul>
      </div>
      {!totalTasks && (
        <p className="widget-hint task-pie-hint">
          Task totals will update as tasks are created.
        </p>
      )}
    </article>
  );
}
