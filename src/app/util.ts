import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Util {

  DEFAULT_9x9_CAGE_GROUPINGS: any[][] = [[0, 0, 0, 1, 1, 1, 2, 2, 2],
    [0, 0, 0, 1, 1, 1, 2, 2, 2],
    [0, 0, 0, 1, 1, 1, 2, 2, 2],
    [3, 3, 3, 4, 4, 4, 5, 5, 5],
    [3, 3, 3, 4, 4, 4, 5, 5, 5],
    [3, 3, 3, 4, 4, 4, 5, 5, 5],
    [6, 6, 6, 7, 7, 7, 8, 8, 8],
    [6, 6, 6, 7, 7, 7, 8, 8, 8],
    [6, 6, 6, 7, 7, 7, 8, 8, 8]];

  DEFAULT_6x6_CAGE_GROUPINGS: any[][] = [[0, 0, 0, 1, 1, 1],
    [0, 0, 0, 1, 1, 1],
    [2, 2, 2, 3, 3, 3],
    [2, 2, 2, 3, 3, 3],
    [4, 4, 4, 5, 5, 5],
    [4, 4, 4, 5, 5, 5]];

  CAGE_COLOR_ARR: string[] = [
    '#2f4f4f', '#556b2f', '#228b22', '#7f0000', '#808000',
    '#483d8b', '#d2691e', '#9acd32', '#20b2aa', '#00008b',
    '#daa520', '#8fbc8f', '#800080', '#b03060', '#ff0000',
    '#00ff00', '#a9a9a9', '#00ff7f', '#dc143c', '#00ffff',
    '#00bfff', '#0000ff', '#a020f0', '#ff00ff', '#fa8072',
    '#ffff54', '#6495ed', '#dda0dd', '#90ee90', '#ff1493',
    '#7b68ee', '#afeeee', '#ee82ee', '#ffdead', '#ffb6c1',
  ];

  MIN_BOARD_SIZE = 3;
  MAX_BOARD_SIZE = 35;
  DEFAULT_CELL_SIZE = 48;

  moreThanOneIsland(cageGroupingsArray: any[][], value: any): boolean {
    let numberOfIslands = 0;
    // Create copy of array to not change original values
    let testArray = JSON.parse(JSON.stringify(cageGroupingsArray));
    for (let i = 0; i < testArray.length; i++) {
      for (let j = 0; j < testArray.length; j++) {
        // Find cell that matches value
        if (testArray[i][j] === value) {
          numberOfIslands += 1;
          this.deleteIsland(testArray, value, i, j);
        }

        if (numberOfIslands > 1) {
          return true;
        }
      }
    }
    return false;
  }

  deleteIsland(testArray: any[], value: any, row: number, column: number): void {
    if (row < 0 || row >= testArray.length || column < 0 || column >= testArray.length || testArray[row][column] !== value) {
      return; // out of range or no longer part of island
    }
    // Remove island value - set to null
    testArray[row][column] = null;
    // Recursively iterate over all neighbors to delete entire island
    this.deleteIsland(testArray, value, row + 1, column);
    this.deleteIsland(testArray, value, row - 1, column);
    this.deleteIsland(testArray, value, row, column + 1);
    this.deleteIsland(testArray, value, row, column - 1);
  }

  times(value: number): any[] {
    // creates empty list to loop over (x) times
    let array = [];
    for (let index = 0; index < value; index++) {
      array.push(index)
    }
    return array;
  }

  generateEmptyGridArray(gridSize: number): any[][] {
    let gridArray: any[][] = [];
    for (let row = 0; row < gridSize; row++) {
      let emptyArray: any[] = [];
      for (let column = 0; column < gridSize; column++) {
        emptyArray.push(null);
      }
      gridArray.push(emptyArray);
    }
    return gridArray;
  }

  getTileValue(index: any): any {
    // translate index value to sudoku value, use alpha characters for grids above 9x9
    if (index === null || Number.isNaN(index)) {
      return '';
    }
    return '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(index);
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

  frequency2DArray(arr2D: any[][], item: any): number {
    let freq = 0;
    arr2D.forEach(arr => {
      freq += this.frequencyArray(arr, item);
    });
    return freq;
  }

  frequencyArray(arr: any[], item: any): number {
    return arr.filter(x => x === item).length;
  }

  getColumnCells(arr: any[][], col: number): any[] {
    return arr.map(row => row[col]);
  }

  getCageCells(arr: any[][], cageArray: any[][], cage: number): any[] {
    let cageCells = [];
    for (let row = 0; row < cageArray.length; row++) {
      for (let col = 0; col < cageArray.length; col++) {
        if (cageArray[row][col] === cage) {
          cageCells.push(arr[row][col]);
        }
      }
    }
    return cageCells;
  }
}
