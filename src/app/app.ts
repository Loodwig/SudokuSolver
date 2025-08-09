import {Component, AfterViewInit, ViewEncapsulation, HostListener} from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import {FormsModule} from '@angular/forms';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatTooltip} from '@angular/material/tooltip';
import {Util} from './util';
import {Solver} from './solver';

interface BoardSettings {
  size: number;
  pixelDimensions: string;
  pixelDimensions_InputBar: string;
  type: string;
}

@Component({
  selector: 'app-root',
  imports: [
    FormsModule, MatRadioModule, MatInput, MatLabel, MatFormField, MatCheckbox, MatTooltip
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements AfterViewInit {
  constructor(public util: Util,
              public solver: Solver) {
  }

  boardSettings: BoardSettings = {
    size: 9,
    pixelDimensions: '450px',
    pixelDimensions_InputBar: '600px',
    type: 'classic9x9',
  };

  gameRules: GameRules = {
    standard: true,
    consecutive: false,
    knightsMove: false,
    kingsMove: false,
  }

  rulesTooltip: Map<string, string> = new Map([
    ['standard', 'Classic Sudoku Rules: Every row, column, and cage needs to contain every digit exactly once.'],
    ['consecutive', 'Consecutive values can not be adjacent to each other.'],
    ['knightsMove', 'Values can not be a chess knight\'s move away from each other.'],
    ['kingsMove', 'Values can not be a chess king\'s move away from each other.'],
  ]);

  // Array for indicating which cells are in the same cage, allows for custom drawn cages, default to standard 9x9 sudoku grid
  // stored in 2d array to be accessed by row-column indexes
  cageGroupingsArray: any[][] = [];

  // Array for storing initial grid values - uses value indexes instead of literal values
  initialGridArray: any[][] = [];

  // Array for storing solved grid values - uses value indexes instead of literal values
  solvedGridArray: any[][] = [];

  editMode: string = 'cellEdit';
  selectedValue: number | null = 0;

  cageErrorMessage: string = '';
  cellErrorMessage: string = '';
  solveButtonText: string = 'Solve Grid';

  @HostListener('window:keydown.Space', ['$event'])
  handleSpacebarPress(event: Event) {
    // Prevent default action (e.g., scrolling if an element has focus)
    event.preventDefault();
    // Add your desired logic here
    this.selectNextTile();
  }

  ngAfterViewInit(): void {
    this.createBoard();
  }

  createBoard(): void {
    this.editMode = 'cellEdit';
    this.clearCageBorders();

    // Get settings
    if (this.boardSettings.type === 'classic9x9') {
      this.boardSettings.size = 9;
      this.cageGroupingsArray = this.util.DEFAULT_9x9_CAGE_GROUPINGS;
    } else if (this.boardSettings.type === 'classic6x6') {
      this.boardSettings.size = 6;
      this.cageGroupingsArray = this.util.DEFAULT_6x6_CAGE_GROUPINGS;
    } else {
      if (Number.isNaN(this.boardSettings.size) || this.boardSettings.size < this.util.MIN_BOARD_SIZE || this.boardSettings.size > this.util.MAX_BOARD_SIZE) {
        this.boardSettings.size = 9;
      }
      this.cageGroupingsArray = this.util.generateEmptyGridArray(this.boardSettings.size);
      this.editMode = 'cageEdit';
    }

    this.initialGridArray = this.util.generateEmptyGridArray(this.boardSettings.size);
    this.solvedGridArray = this.util.generateEmptyGridArray(this.boardSettings.size);

    // Calculate board size
    this.boardSettings.pixelDimensions = (this.boardSettings.size * 50) + 'px';
    this.boardSettings.pixelDimensions_InputBar = ((this.boardSettings.size + 3) * 50) + 'px';

    // Delay 0 seconds to push to end of instruction set, allowing cells to render into existence before accessing them
    setTimeout(() => {
      // Apply cage edges to tiles
      this.drawCageBorders();
    }, 0);

    this.selectInputTile(0);
  }

  clearCageBorders(): void {
    for (let row = 0; row < this.boardSettings.size; row++) {
      for (let column = 0; column < this.boardSettings.size; column++) {
        let cell = document.getElementById('tile' + row + '-' + column);
        if (cell === null) {
          continue;
        }

        // reset cages
        cell.classList.remove('cageTop');
        cell.classList.remove('cageBottom');
        cell.classList.remove('cageLeft');
        cell.classList.remove('cageRight');
        cell.classList.remove('cageTopEdgeOfBoard');
        cell.classList.remove('cageBottomEdgeOfBoard');
        cell.classList.remove('cageLeftEdgeOfBoard');
        cell.classList.remove('cageRightEdgeOfBoard');

        cell.style.width = this.util.DEFAULT_CELL_SIZE + 'px';
        cell.style.height = this.util.DEFAULT_CELL_SIZE + 'px';
      }
    }
  }

  drawCageBorders(): void {
    this.clearCageBorders();
    for (let row = 0; row < this.boardSettings.size; row++) {
      for (let column = 0; column < this.boardSettings.size; column++) {
        let cell = document.getElementById('tile' + row + '-' + column);
        if (cell === null) {
          continue;
        }

        let cellWidth = this.util.DEFAULT_CELL_SIZE;
        let cellHeight = this.util.DEFAULT_CELL_SIZE;

        // Check top border - apply cage if top of grid or cell above is different group
        if (row === 0) {
          cell.classList.add('cageTopEdgeOfBoard');
          cellHeight -= 3;
        } else if (this.cageGroupingsArray[row][column] !== this.cageGroupingsArray[row - 1][column]) {
          cell.classList.add('cageTop');
          cellHeight -= 1;
        }

        // Check bottom border
        if (row === this.boardSettings.size - 1) {
          cell.classList.add('cageBottomEdgeOfBoard');
          cellHeight -= 3;
        } else if (this.cageGroupingsArray[row][column] !== this.cageGroupingsArray[row + 1][column]) {
          cell.classList.add('cageBottom');
          cellHeight -= 1;
        }

        // Check left border
        if (column === 0) {
          cell.classList.add('cageLeftEdgeOfBoard');
          cellWidth -= 3;
        } else if (this.cageGroupingsArray[row][column] !== this.cageGroupingsArray[row][column - 1]) {
          cell.classList.add('cageLeft');
          cellWidth -= 1;
        }

        // Check right border
        if (column === this.boardSettings.size - 1) {
          cell.classList.add('cageRightEdgeOfBoard');
          cellWidth -= 3;
        } else if (this.cageGroupingsArray[row][column] !== this.cageGroupingsArray[row][column + 1]) {
          cell.classList.add('cageRight');
          cellWidth -= 1;
        }

        cell.style.width = cellWidth + 'px';
        cell.style.height = cellHeight + 'px';
      }
    }
  }

  checkCageErrors(): void {
    this.cageErrorMessage = '';
    // Check that all cages are filled
    this.cageGroupingsArray.forEach(row => {
      row.forEach((cell) => {
        if (cell === null) {
          this.cageErrorMessage = 'Uh oh! All cells need to be assigned a cage.'
          return;
        }
      });
    });
    // Check that each cage has same count = boardSettings.size
    const frequency = (arr: any[][], item: any) => {
      let freq = 0;
      for (let i = 0; i < arr.length; i++) {
        freq += arr[i].filter(x => x === item).length;
      }
      return freq;
    };
    for (let index = 0; index < this.boardSettings.size; index++) {
      if (frequency(this.cageGroupingsArray, index) !== this.boardSettings.size) {
        this.cageErrorMessage = 'Uh oh! All cages must be exactly ' + this.boardSettings.size + ' cells.';
        return;
      }
    }
    // Check that cages have no islands
    for (let index = 0; index < this.boardSettings.size; index++) {
      if (this.util.moreThanOneIsland(this.cageGroupingsArray, index)) {
        this.cageErrorMessage = 'Uh oh! Cages with same number must be connected.';
        return;
      }
    }
    // No issues
    return;
  }

  getCellValue(row: number, column: number): string {
    let value: any = null;
    if (this.editMode === 'cageEdit') {
      if (this.cageGroupingsArray.length > row && this.cageGroupingsArray[row].length > column) {
        value = this.cageGroupingsArray[row][column];
      }
    } else if (this.editMode === 'cellEdit') {
      if (this.initialGridArray.length > row && this.initialGridArray[row].length > column) {
        value = this.initialGridArray[row][column];
      }
    } else {
      if (this.solvedGridArray.length > row && this.solvedGridArray[row].length > column) {
        value = this.solvedGridArray[row][column];
      }
    }
    return this.util.getTileValue(value);
  }

  getCellColor(row: number, column: number): string {
    if (this.editMode !== 'cageEdit') {
      return '#FFFFFFFF';
    }

    return this.getCageColor(this.cageGroupingsArray[row][column]);
  }

  getTextColor(row: number, column: number): string {
    if (this.editMode !== 'solved') {
      return '#000000FF';
    }

    if (this.initialGridArray[row][column] !== null) {
      // Initial values show black
      return '#000000FF';
    } else {
      // Solved values show blue
      return '#14285AFF';
    }
  }

  getCageColor(value: number): string {
    if (value === null) {
      return '#FFFFFFFF';
    }
    return this.util.CAGE_COLOR_ARR[value];
  }

  toggleEditMode(): void {
    // toggle to different edit mode
    this.editMode = (this.editMode === 'cellEdit' ? 'cageEdit' : 'cellEdit' );
  }

  selectNextTile(): void {
    let index = 0;
    if (this.selectedValue !== null) {
      // select next
      index = this.selectedValue + 1;
      if (index >= this.boardSettings.size) {
        // loop back around to beginning
        index = 0;
      }
    }
    this.selectInputTile(index);
  }

  selectInputTile(index: any): void {
    // Remove selection highlight from previously selected cell
    let prevCell = document.getElementById('input' + (this.selectedValue === null ? 'Null' : this.selectedValue));
    if (prevCell !== null) {
      prevCell.classList.remove('number-selected');
    }

    // Add selection highlighting to newly selected cell
    this.selectedValue = index;
    let nextCell = document.getElementById('input' + (index === null ? 'Null' : index));
    if (nextCell !== null) {
      nextCell.classList.add('number-selected');
    }
  }

  setCellValue(row: number, column: number): void {
    if (this.editMode === 'cageEdit') {
      if (this.cageGroupingsArray.length > row && this.cageGroupingsArray[row].length > column) {
        this.cageGroupingsArray[row][column] = this.selectedValue;
        this.drawCageBorders();
        this.checkCageErrors();
      }
    } else if (this.editMode === 'cellEdit') {
      if (this.initialGridArray.length > row && this.initialGridArray[row].length > column) {
        this.initialGridArray[row][column] = this.selectedValue;
        // this.highlightConflicting();
      }
    } else {
      if (this.solvedGridArray.length > row && this.solvedGridArray[row].length > column) {
        this.solvedGridArray[row][column] = this.selectedValue;
      }
    }
  }

  clearValues(): void {
    if (!confirm('Are you sure you want to clear the board?')) {
      return;
    }

    if (this.editMode === 'cageEdit') {
      this.cageGroupingsArray = this.util.generateEmptyGridArray(this.boardSettings.size);
      this.drawCageBorders();
    } else if (this.editMode === 'cellEdit') {
      this.initialGridArray = this.util.generateEmptyGridArray(this.boardSettings.size);
    } else {
      this.solvedGridArray = this.util.generateEmptyGridArray(this.boardSettings.size);
    }
  }

  solve(): void {
    if (this.editMode === 'solved') {
      return;
    }

    this.solveButtonText = 'Solving...';
    this.editMode = 'solving';

    // Calculate
    this.solvedGridArray = this.solver.solveGrid(this.initialGridArray, this.cageGroupingsArray, this.gameRules);

    this.editMode = 'solved';
    if (this.solver.checkSolved(this.solvedGridArray)) {
      this.solveButtonText = 'Solved';
    } else {
      this.solveButtonText = 'Unsolvable!';
    }
  }

  reset(): void {
    this.editMode = 'cellEdit';
    this.solveButtonText = 'Solve Grid';
    this.solvedGridArray = this.util.generateEmptyGridArray(this.boardSettings.size);
  }
}
