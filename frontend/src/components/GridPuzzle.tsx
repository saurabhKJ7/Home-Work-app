import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GridPuzzleProps {
  gridData: number[][];
  onSubmit: (answers: number[][]) => void;
  isReadOnly?: boolean;
  correctAnswer?: number[][];
}

const GridPuzzle = ({ gridData, onSubmit, isReadOnly = false, correctAnswer }: GridPuzzleProps) => {
  const [answers, setAnswers] = useState<number[][]>(
    gridData.map(row => row.map(cell => cell === 0 ? 0 : cell))
  );
  const [selectedCell, setSelectedCell] = useState<{row: number; col: number} | null>(null);

  const handleCellChange = (row: number, col: number, value: string) => {
    if (isReadOnly || gridData[row][col] !== 0) return;
    
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    if (numValue < 0 || numValue > 9) return;
    
    const newAnswers = [...answers];
    newAnswers[row][col] = numValue;
    setAnswers(newAnswers);
  };

  const handleCellClick = (row: number, col: number) => {
    if (isReadOnly || gridData[row][col] !== 0) return;
    setSelectedCell({ row, col });
  };

  const getCellClassName = (row: number, col: number) => {
    const isOriginal = gridData[row][col] !== 0;
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isCorrect = correctAnswer ? answers[row][col] === correctAnswer[row][col] : null;
    const isIncorrect = correctAnswer ? answers[row][col] !== 0 && answers[row][col] !== correctAnswer[row][col] : null;
    
    let className = "w-12 h-12 text-center border-2 rounded-md font-medium transition-all duration-200 ";
    
    if (isOriginal) {
      className += "bg-muted font-bold cursor-not-allowed ";
    } else {
      className += "bg-background hover:bg-accent cursor-pointer ";
      if (isSelected) className += "ring-2 ring-primary ";
    }
    
    if (correctAnswer) {
      if (isCorrect) className += "bg-easy-background text-easy border-easy ";
      else if (isIncorrect) className += "bg-hard-background text-hard border-hard ";
    }
    
    return className;
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="grid grid-cols-9 gap-1 p-4 bg-subtle-gradient rounded-lg shadow-card">
        {answers.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClassName(rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {gridData[rowIndex][colIndex] !== 0 ? (
                <span className="leading-12">{gridData[rowIndex][colIndex]}</span>
              ) : (
                <Input
                  type="text"
                  value={cell === 0 ? '' : cell.toString()}
                  onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                  className="w-full h-full border-0 text-center p-0 bg-transparent focus:ring-0 focus:border-0"
                  maxLength={1}
                  disabled={isReadOnly}
                />
              )}
            </div>
          ))
        )}
      </div>
      
      {!isReadOnly && (
        <Button variant="hero" onClick={() => onSubmit(answers)} className="px-8">
          Submit Solution
        </Button>
      )}
    </div>
  );
};

export default GridPuzzle;