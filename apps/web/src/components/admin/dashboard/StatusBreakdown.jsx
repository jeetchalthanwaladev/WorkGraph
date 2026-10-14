export default function StatusBreakdown({ statuses, totalTasks }) {
  return (
    <article className="panel admin-widget">
      <div className="panel-heading">
        <div>
          <h2>Task status</h2>
          <p>Current work across the whole team</p>
        </div>
        <span className="count-badge">{totalTasks}</span>
      </div>
      <div className="status-breakdown">
        {statuses.map((status) => {
          const percent = totalTasks
            ? Math.round((status.count / totalTasks) * 100)
            : 0;
          return (
            <div className="status-row" key={status.id}>
              <div className="status-row-label">
                <span>
                  <i className={`status-dot ${status.color}`} />
                  {status.label}
                </span>
                <strong>{status.count}</strong>
              </div>
              <div className="status-track">
                <span
                  className={`status-fill ${status.color}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        {totalTasks === 0 && (
          <p className="widget-hint">
            Task totals will update as tasks are created.
          </p>
        )}
      </div>
    </article>
  );
}
