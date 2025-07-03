import React from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Commentable } from '../comments/Commentable';

// A placeholder for a more sophisticated note editor
const NoteEditor = ({ content }: { content: string }) => {
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
}

export const NotesToFinancialStatements: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

  if (!currentProject) {
    return <div>Loading project data...</div>;
  }

  const activePeriod = currentProject.periods.find(p => p.id === activePeriodId);
  const reportingDate = activePeriod?.reportingDate ? new Date(activePeriod.reportingDate) : new Date();

  // Placeholder notes data structure. In a real app, this would be more complex.
  const notes = currentProject.notes || {
    accountingPolicies: {
        title: "1. Significant Accounting Policies",
        content: "<p>The principal accounting policies applied in the preparation of these financial statements are set out below.</p>"
    },
    revenueRecognition: {
        title: "2. Revenue Recognition",
        content: "<p>Revenue is measured at the fair value of the consideration received or receivable.</p>"
    },
    propertyPlantEquipment: {
        title: "3. Property, Plant and Equipment",
        content: "<p>All property, plant and equipment is stated at historical cost less depreciation.</p>"
    }
  };

  const noteKeys = Object.keys(notes) as Array<keyof typeof notes>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes to the Financial Statements</CardTitle>
        <p className="text-sm text-muted-foreground">For the year ended {reportingDate.toLocaleDateString()}</p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {noteKeys.map(noteKey => {
                const note = notes[noteKey];
                if(!note) return null;
                const noteKeyStr = String(noteKey);
                return (
                    <Commentable key={noteKeyStr} elementId={`note-${noteKeyStr}`}>
                        <AccordionItem value={noteKeyStr}>
                            <AccordionTrigger>{note.title}</AccordionTrigger>
                            <AccordionContent>
                                <NoteEditor content={note.content} />
                            </AccordionContent>
                        </AccordionItem>
                    </Commentable>
                )
            })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
