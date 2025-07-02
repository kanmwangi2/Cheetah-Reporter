import React, { useState, useEffect } from 'react';
import type { AuditLog } from '../../../lib/auditTrailService';
import { subscribeToAuditTrail } from '../../../lib/auditTrailService';
import { useProjectStore } from '../../../store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ScrollArea } from '../../ui/scroll-area';
import { format } from 'date-fns';

export const AuditTrailViewer: React.FC = () => {
  const { currentProject } = useProjectStore();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject?.id) return;

    setLoading(true);
    const unsubscribe = subscribeToAuditTrail(currentProject.id, (logs) => {
      setAuditLogs(logs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentProject?.id]);

  const renderLogDetails = (log: AuditLog) => {
    return (
      <div className="text-sm text-muted-foreground">
        <p><strong>User:</strong> {log.userEmail}</p>
        <p><strong>Action:</strong> <span className="font-semibold">{log.action}</span></p>
        {Object.keys(log.details).length > 0 && (
          <pre className="mt-2 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail & Version History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading history...</p>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-background rounded-lg border">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium">
                        {format(new Date(log.timestamp?.toDate()), 'PPP p')}
                      </p>
                    </div>
                    {renderLogDetails(log)}
                  </div>
                ))
              ) : (
                <p>No history found for this project.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
