import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Solver {
  notesGrid: any[][][] = [];
  initialGrid: any[][] = [];
  cageGrid: any[][] = [];
  solvedGrid: any[] = [];

  cellUpdated = false;
  errorEncountered = true;

  public solveGrid(initialGrid: any[][], cageGrid: any[][], gameRules: GameRules): any[][] {

    // Copy initial values
    this.initialGrid = initialGrid;
    this.cageGrid = cageGrid;
    this.solvedGrid = JSON.parse(JSON.stringify(initialGrid));
    this.notesGrid = []; // [row][column][possible answers]

    // Populate notesGrid
    this.populateNotesGrid();

    // Main Solving loop
    // Keep looping until we solve it or we go through a whole iteration without an update
    this.cellUpdated = true;
    this.errorEncountered = false;
    while (!this.checkSolved(this.solvedGrid) && this.cellUpdated && !this.errorEncountered) {
      this.cellUpdated = false;

      if (gameRules.standard) {
        this.checkForNakedSingles();
      }
      // todo more rules

      // Update solved grid with new finds
      if (this.cellUpdated) {
        this.updateSolvedGrid();
      }
    }

    return this.solvedGrid;
  }

  populateNotesGrid() {
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

  checkSolved(solvedGrid: any[][]): boolean {
    for (let row = 0; row < solvedGrid.length; row++) {
      for (let col = 0; col < solvedGrid.length; col++) {
        if (solvedGrid[row][col] === null) {
          return false;
        }
      }
    }
    return true;
  }

  updateSolvedGrid(): void {
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
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length === 1) {
          this.solvedGrid[row][col] = this.notesGrid[row][col][0];
        }
      }
    }
  }

  checkForNakedSingles(): void {
    for (let row = 0; row < this.notesGrid.length; row++) {
      for (let col = 0; col < this.notesGrid.length; col++) {
        if (this.notesGrid[row][col].length !== 1 || this.notesGrid[row][col][0] === null) {
          continue;
        }

        // naked single found,
        let nakedSingle = this.notesGrid[row][col][0];

        // remove from other cells in same row and column
        for (let removeFromIndex = 0; removeFromIndex < this.notesGrid.length; removeFromIndex++) {
          // check that its not removing the current cell, and make sure it actually contains the naked single
          if (removeFromIndex !== col) {
            let index = this.notesGrid[row][removeFromIndex].indexOf(nakedSingle);
            if (index > -1) { // Check if the value exists
              this.notesGrid[row][removeFromIndex].splice(index, 1);
              this.cellUpdated = true;
            }
          }

          // check that its not removing the current cell, and make sure it actually contains the naked single
          if (removeFromIndex !== row) {
            let index = this.notesGrid[removeFromIndex][col].indexOf(nakedSingle);
            if (index > -1) { // Check if the value exists
              this.notesGrid[removeFromIndex][col].splice(index, 1);
              this.cellUpdated = true;
            }
          }
        }

        // remove from other cells in same cage
        let cageIndex = this.cageGrid[row][col];
        for (let removalRow = 0; removalRow < this.notesGrid.length; removalRow++) {
          for (let removalCol = 0; removalCol < this.notesGrid.length; removalCol++) {
            // Check for different cell but same cage
            if ((removalRow !== row || removalCol !== col) && this.cageGrid[removalRow][removalCol] === cageIndex) {
              let index = this.notesGrid[removalRow][removalCol].indexOf(nakedSingle);
              if (index > -1) { // Check if the value exists
                this.notesGrid[removalRow][removalCol].splice(index, 1);
                this.cellUpdated = true;
              }
            }
          }
        }
      }
    }
  }

}



