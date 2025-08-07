import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const ActivityGrid = ({ gridData, onSubmit, isSubmitted = false, solution = [] }) => {
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [validationResults, setValidationResults] = useState(new Map());

  const toggleCell = (row, col) => {
    if (isSubmitted) return;

    const cellKey = `${row}-${col}`;
    const newSelected = new Set(selectedCells);
    
    if (newSelected.has(cellKey)) {
      newSelected.delete(cellKey);
    } else {
      newSelected.add(cellKey);
    }
    
    setSelectedCells(newSelected);
  };

  const handleSubmit = () => {
    // Mock validation logic
    const results = new Map();
    const selectedCoords = Array.from(selectedCells).map(key => {
      const [row, col] = key.split('-').map(Number);
      return [row, col];
    });

    // Simple validation: check if selected coordinates match solution
    selectedCoords.forEach(([row, col]) => {
      const cellKey = `${row}-${col}`;
      const isCorrect = solution.some(([sRow, sCol]) => sRow === row && sCol === col);
      results.set(cellKey, isCorrect);
    });

    setValidationResults(results);
    onSubmit(selectedCoords, results);
  };

  const getCellClassName = (row, col) => {
    const cellKey = `${row}-${col}`;
    const isSelected = selectedCells.has(cellKey);
    const isValidated = validationResults.has(cellKey);
    
    let className = "w-16 h-16 border text-sm font-medium transition-all duration-200 ";
    
    if (isSubmitted && isValidated) {
      const isCorrect = validationResults.get(cellKey);
      className += isCorrect 
        ? "border-success bg-success/10 text-success-foreground"
        : "border-destructive bg-destructive/10 text-destructive-foreground";
    } else if (isSelected) {
      className += "border-primary bg-accent text-accent-foreground";
    } else {
      className += "border-border bg-secondary hover:bg-accent text-secondary-foreground";
    }
    
    return className;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-2 w-fit mx-auto">
        {gridData.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              variant="ghost"
              className={getCellClassName(rowIndex, colIndex)}
              onClick={() => toggleCell(rowIndex, colIndex)}
              disabled={isSubmitted}
            >
              {cell}
            </Button>
          ))
        )}
      </div>
      
      {!isSubmitted && (
        <div className="flex justify-center">
          <Button onClick={handleSubmit} disabled={selectedCells.size === 0}>
            Check Answer
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityGrid;