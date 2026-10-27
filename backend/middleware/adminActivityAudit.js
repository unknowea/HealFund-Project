import AdminActivityLog from '../models/AdminActivityLog.js';

const describeRequest = (method, path) => {
  const segments = path.split('/').filter(Boolean);
  const offset = segments[1] === 'admin' ? 2 : 1;
  const resource = segments[offset] || 'Admin';
  const entityType = ({
    appointments: 'Appointment',
    queue: 'Queue',
    documents: 'Document',
    users: 'User',
    hospitals: 'Hospital',
    'financial-cases': 'Financial case',
    messages: 'Message',
  })[resource] || 'Admin record';
  const operation = segments[offset + 2] || segments[offset + 1] || method.toLowerCase();
  const action = ({
    approve: 'approved',
    reject: 'rejected',
    'request-docs': 'requested documents for',
    'cancellation-request': 'reviewed cancellation for',
    verify: 'verified',
    status: 'changed status for',
  })[operation] || `${method === 'DELETE' ? 'deleted' : method === 'POST' ? 'created' : 'updated'}`;
  const entityId = segments[offset + 1] && !['activity-log', 'stats'].includes(segments[offset + 1])
    ? segments[offset + 1].slice(0, 120)
    : undefined;

  return { action: `${entityType} ${action}`, entityType, entityId };
};

const isAuditableMutation = (method, path) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
  if (path.startsWith('/api/admin/')) return true;
  if (/^\/api\/appointments\/[^/]+(?:\/(?:approve|reject|request-docs|cancellation-request))?$/.test(path)) return true;
  return /^\/api\/queue\/[^/]+(?:\/status)?$/.test(path);
};

export default function adminActivityAudit(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  if (!isAuditableMutation(req.method, path)) return next();

  res.once('finish', () => {
    if (
      res.statusCode >= 400 ||
      !req.user?.id ||
      !['admin', 'hospital_officer'].includes(req.user.role)
    ) return;

    const activity = describeRequest(req.method, path);
    AdminActivityLog.create({
      actorUserId: String(req.user.id),
      actorEmail: req.user.email || 'Unknown',
      actorRole: req.user.role,
      ...activity,
      method: req.method,
      statusCode: res.statusCode,
    }).catch((error) => {
      console.error('Could not persist admin activity log entry:', error);
    });
  });

  return next();
}
