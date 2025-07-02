import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialRatios from './FinancialRatios';
import Validation from './Validation';
import PeriodSelector from './PeriodSelector';
import VarianceAnalysis from './VarianceAnalysis';

const Analysis: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Financial Analysis</h2>
        <PeriodSelector />
      </div>
      <Tabs defaultValue="ratios" className="w-full">
        <TabsList>
          <TabsTrigger value="ratios">Financial Ratios</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="ratios">
          <FinancialRatios />
        </TabsContent>
        <TabsContent value="validation">
          <Validation />
        </TabsContent>
        <TabsContent value="variance">
          <VarianceAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;
