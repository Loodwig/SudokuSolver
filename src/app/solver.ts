import {Injectable} from '@angular/core';
import {Util} from './util';

@Injectable({
  providedIn: 'root',
})
export class Solver {
  constructor(public util: Util) {}

  private notesGrid: any[][][] = [];
  private initialGrid: any[][] = [];
  private cageGrid: any[][] = [];
  private solvedGrid: any[] = [];

  // Statistics for types of solves
  public numGivens = 0;
  public numSingles = 0;
  public numHiddenSingles = 0;

  private cellUpdated = false;
  private errorEncountered = true;

  public solveGrid(initialGrid: any[][], cageGrid: any[][], gameRules: GameRules): any[][] {
    // Copy initial values
    this.initialGrid = initialGrid;
    this.cageGrid = cageGrid;
    this.solvedGrid = JSON.parse(JSON.stringify(initialGrid));
    this.notesGrid = []; // [row][column][possible answers]

    this.numGivens = this.initialGrid.flatMap(row => row).filter(val => val !== null).length;

    // Populate notesGrid
    this.populateNotesGrid();

    // Main Solving loop
    // Keep looping until we solve it, find an unsolvable cell, or go through a whole iteration without making progress
    this.cellUpdated = true;
    this.errorEncountered = false;
    while (!this.util.checkSolved(this.solvedGrid) && this.cellUpdated && !this.errorEncountered) {
      this.cellUpdated = false;

      // Standard rules: only one of each number in each row, column, and cage
      this.updateNotes_standardRules();

      if (gameRules.consecutive) {
        // Consecutive: adjacent cells cant be consecutive values
        this.updateNotes_consecutive();
      }
      if (gameRules.kingsMove) {
        // Kings move: same value cant be within a chess king's move away
        // (only need to check corners since standard rules support adjacent cells)
        this.updateNotes_kingsMove();
      }
      if (gameRules.knightsMove) {
        // Knights move: same value cant be within a chess knight's move away
        this.updateNotes_knightsMove();
      }

      // todo: Look for set theory situations if notes weren't updated

      // Update solved grid with new finds
      if (this.cellUpdated) {
        this.updateSolvedGrid();
      }
    }

    return this.solvedGrid;
  }

  private populateNotesGrid() {
    for (let row = 0; row < this.initialGrid.length; row++) {
      this.notesGrid.push([]);
      for (let col = 0; col < this.initialGrid.length; col++) {
        this.notesGrid[row].push([]);
        if (this.initialGrid[row][col] !== null) {
          // already have this digit set, so only note is the digit
          this.notesGrid[row][col].push(this.initialGrid[row][col]);
        } else {
          for (let val = 0; val < this.initialGrid.length; val++) {
            // add all notes
            this.notesGrid[row][col].push(val);
          }
        }
      }
    }
  }

  private updateSolvedGrid(): void {
    // Look for errors before update solved grid
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length === 0) {
          this.errorEncountered = true;
          return;
        }
      }
    }

    // Update solved grid
    // Look for singles
    this.updateSolvedGrid_findSingles();
    if (this.errorEncountered) {
      return;
    }
    // Look for hidden singles
    this.updateSolvedGrid_findHiddenSingles();
    if (this.errorEncountered) {
      return;
    }
  }

  private updateSolvedGrid_findSingles() {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length === 1) {
          this.solvedGrid[row][col] = this.notesGrid[row][col][0];
          this.numSingles++;
        }
      }
    }
  }

  private updateSolvedGrid_findHiddenSingles() {
    for (let value = 0; value < this.notesGrid.length; value++) {
      // check each row for hidden singles
      for (let row = 0; row < this.notesGrid.length; row++) {
        // don't bother checking if value is already solved for this row
        let solvedFreq = this.util.frequencyArray(this.solvedGrid[row], value);
        if (solvedFreq > 1) {
          this.errorEncountered = true;
          return;
        } else if (solvedFreq === 1) {
          continue;
        }

        let notesFreq = this.util.frequency2DArray(this.notesGrid[row], value);
        if (notesFreq === 0) {
          this.errorEncountered = true;
          return;
        } else if (notesFreq === 1) {
          // Hidden single found - locate the col of the cell
          let col = this.notesGrid[row].findIndex(arr => arr.includes(value));
          this.solvedGrid[row][col] = value;
          this.numHiddenSingles++;
        }
      }

      // check each column for hidden singles
      for (let col = 0; col < this.notesGrid.length; col++) {
        // don't bother checking if value is already solved for this col
        let solvedFreq = this.util.frequencyArray(this.util.getColumnCells(this.solvedGrid, col), value);
        if (solvedFreq > 1) {
          this.errorEncountered = true;
          return;
        } else if (solvedFreq === 1) {
          continue;
        }

        let notesFreq = this.util.frequency2DArray(this.util.getColumnCells(this.notesGrid, col), value);
        if (notesFreq === 0) {
          this.errorEncountered = true;
          return;
        } else if (notesFreq === 1) {
          // Hidden single found - locate the row of the cell
          let row = this.util.getColumnCells(this.notesGrid, col).findIndex(arr => arr.includes(value));
          this.solvedGrid[row][col] = value;
          this.numHiddenSingles++;
        }
      }

      // check each cage for hidden singles
      for (let cage = 0; cage < this.notesGrid.length; cage++) {
        let solvedFreq = this.util.frequencyArray(this.util.getCageCells(this.solvedGrid, this.cageGrid, cage), value);
        if (solvedFreq > 1) {
          this.errorEncountered = true;
          return;
        } else if (solvedFreq === 1) {
          continue;
        }

        let cageCells = this.util.getCageCells(this.notesGrid, this.cageGrid, cage);
        let notesFreq = this.util.frequency2DArray(cageCells, value);
        if (notesFreq === 0) {
          this.errorEncountered = true;
          return;
        } else if (notesFreq === 1) {
          // Hidden single found - locate the row/col of the cell from its position in the cage
          let cellPositionInCage = cageCells.findIndex(arr => arr.includes(value));
          let cellPositionLookupCounter = 0;
          let cellFound = false;
          for (let row = 0; row < this.notesGrid.length && !cellFound; row++) {
            for (let col = 0; col < this.notesGrid.length && !cellFound; col++) {
              if (this.cageGrid[row][col] === cage) {
                if (cellPositionInCage === cellPositionLookupCounter) {
                  cellFound = true;
                  this.solvedGrid[row][col] = value;
                  this.numHiddenSingles++;
                  break;
                }
                cellPositionLookupCounter++;
              }
            }
          }
        }
      }
    }
  }

  private findAndRemoveNote(row: number, col: number, value: number) {
    if (row < 0 || col < 0 || row >= this.notesGrid.length || col >= this.notesGrid.length) {
      return;
    }

    let index = this.notesGrid[row][col].indexOf(value);
    if (index > -1) { // Check if the value exists
      this.notesGrid[row][col].splice(index, 1);
      this.cellUpdated = true;
    }
  }

  private updateNotes_standardRules(): void {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length !== 1 || this.notesGrid[row][col][0] === null) {
          continue;
        }

        // solved value found,
        let solvedValue = this.notesGrid[row][col][0];

        // remove from other cells in same row and column
        for (let removeFromIndex = 0; removeFromIndex < this.notesGrid.length; removeFromIndex++) {
          // check that it's not removing the current cell, and make sure it actually contains the naked single
          if (removeFromIndex !== col) {
            this.findAndRemoveNote(row, removeFromIndex, solvedValue);
          }

          // check that it's not removing the current cell, and make sure it actually contains the naked single
          if (removeFromIndex !== row) {
            this.findAndRemoveNote(removeFromIndex, col, solvedValue);
          }
        }

        // remove from other cells in same cage
        let cageIndex = this.cageGrid[row][col];
        for (let removalRow = 0; removalRow < this.notesGrid.length; removalRow++) {
          for (let removalCol = 0; removalCol < this.notesGrid.length; removalCol++) {
            // Check for different cell but same cage
            if ((removalRow !== row || removalCol !== col) && this.cageGrid[removalRow][removalCol] === cageIndex) {
              this.findAndRemoveNote(removalRow, removalCol, solvedValue);
            }
          }
        }
      }
    }
  }

  private updateNotes_consecutive(): void {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length !== 1) {
          continue;
        }

        let cellValue = this.notesGrid[row][col][0];
        // Check adjacent cells for consecutive value
        // top
        this.findAndRemoveNote(row - 1, col, cellValue - 1);
        this.findAndRemoveNote(row - 1, col, cellValue + 1);
        // bottom
        this.findAndRemoveNote(row + 1, col, cellValue - 1);
        this.findAndRemoveNote(row + 1, col, cellValue + 1);
        // left
        this.findAndRemoveNote(row, col - 1, cellValue - 1);
        this.findAndRemoveNote(row, col - 1, cellValue + 1);
        // right
        this.findAndRemoveNote(row, col + 1, cellValue - 1);
        this.findAndRemoveNote(row, col + 1, cellValue + 1);
      }
    }
  }

  private updateNotes_kingsMove(): void {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length !== 1) {
          continue;
        }

        let cellValue = this.notesGrid[row][col][0];
        // Check corner cells for same value
        // top left
        this.findAndRemoveNote(row - 1, col - 1, cellValue);
        // top right
        this.findAndRemoveNote(row - 1, col + 1, cellValue);
        // bottom left
        this.findAndRemoveNote(row + 1, col - 1, cellValue);
        // bottom right
        this.findAndRemoveNote(row + 1, col + 1, cellValue);
      }
    }
  }

  private updateNotes_knightsMove(): void {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length !== 1) {
          continue;
        }

        let cellValue = this.notesGrid[row][col][0];
        // Check all knights moves: 2 in one direction, 1 perpendicular
        // up 2 left 1
        this.findAndRemoveNote(row - 2, col - 1, cellValue);
        // up 2 right 1
        this.findAndRemoveNote(row - 2, col + 1, cellValue);
        // down 2 left 1
        this.findAndRemoveNote(row + 2, col - 1, cellValue);
        // down 2 right 1
        this.findAndRemoveNote(row + 2, col + 1, cellValue);
        // up 1 left 2
        this.findAndRemoveNote(row - 1, col - 2, cellValue);
        // up 1 right 2
        this.findAndRemoveNote(row - 1, col + 2, cellValue);
        // down 1 left 2
        this.findAndRemoveNote(row + 1, col - 2, cellValue);
        // down 1 right 2
        this.findAndRemoveNote(row + 1, col + 2, cellValue);
      }
    }
  }

}



