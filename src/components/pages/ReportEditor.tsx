import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { StatementOfFinancialPosition } from "../features/financial-statements/StatementOfFinancialPosition";
import { StatementOfProfitOrLoss } from "../features/financial-statements/StatementOfProfitOrLoss";
import { StatementOfChangesInEquity } from "../features/financial-statements/StatementOfChangesInEquity";
import { StatementOfCashFlows } from "../features/financial-statements/StatementOfCashFlows";
import { NotesToFinancialStatements } from "../features/notes/NotesToFinancialStatements";
import Analysis from '../features/financial-statements/Analysis';
import { useUIStore } from "../../store/uiStore";
import { CommentSidebar } from "../features/comments/CommentSidebar";
import { useProjectStore } from "../../store/projectStore";
import { Button } from "../ui/Button";
import { MessageSquare, Upload, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataImport from '../features/data-import/DataImport';

export function ReportEditor() {
  const { currentProject } = useProjectStore();
  const { isCommentSidebarOpen, toggleCommentSidebar } = useUIStore();
  const [isImporting, setIsImporting] = useState(false);

  const handleCommentClick = (elementId: string) => {
    toggleCommentSidebar(elementId);
  };

  if (!currentProject) {
    return <div className="p-4">No active project selected.</div>;
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Edit3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Report Editor</h2>
              <p className="text-muted-foreground">
                Prepare and review the financial statements.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsImporting(true)} data-import-trigger>
              <Upload className="mr-2 h-4 w-4" />
              Import Trial Balance
            </Button>
          </div>
        </div>
        <Tabs defaultValue="sfp" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sfp">SFP</TabsTrigger>
            <TabsTrigger value="pl">P&L and OCI</TabsTrigger>
            <TabsTrigger value="soce">SOCE</TabsTrigger>
            <TabsTrigger value="scf">SCF</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="sfp">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold">Property, Plant and Equipment</h3>
              <Button variant="ghost" size="icon" className="ml-2" onClick={() => handleCommentClick('sfp-ppe')}>
                  <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
            <StatementOfFinancialPosition />
          </TabsContent>
          <TabsContent value="pl">
            <StatementOfProfitOrLoss />
          </TabsContent>
          <TabsContent value="soce">
            <StatementOfChangesInEquity />
          </TabsContent>
          <TabsContent value="scf">
            <StatementOfCashFlows />
          </TabsContent>
          <TabsContent value="notes">
            <NotesToFinancialStatements />
          </TabsContent>
          <TabsContent value="analysis">
            <Analysis />
          </TabsContent>
        </Tabs>
      </div>
      {isCommentSidebarOpen && currentProject && (
        <CommentSidebar
          projectId={currentProject.id}
          onClose={() => toggleCommentSidebar()}
        />
      )}
      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Trial Balance Wizard</DialogTitle>
          </DialogHeader>
          <DataImport onComplete={() => setIsImporting(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
