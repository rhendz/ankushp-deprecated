/**
 * Game of life - Ankush Patel
 * Modified from http://pmav.eu
 */

// Configuration / Functionality is heavily modified.

"use strict";

(function () {
  // var stats = new Stats();
  // stats.setMode(0); // 0 FPS, 1 MS
  //
  // // align top-left
  // stats.domElement.style.position = 'absolute';
  // stats.domElement.style.right = '0px';
  // stats.domElement.style.bottom = '0px';
  // stats.domElement.style.zIndex = '1';

  // document.addEventListener("DOMContentLoaded", function() {
  //   document.body.appendChild( stats.domElement );
  // });

  var GOL = {
    columns: 0,
    rows: 0,
    maxCells: 10000, // Max cells shown in canvas

    waitTime: 0,
    generation: 0,

    running: false,
    autoplay: true,

    // Clear state
    clear: {
      schedule: false,
    },

    // Average execution times
    times: {
      algorithm: 0,
      gui: 0,
    },

    // DOM elements
    element: {
      generation: null,
      steptime: null,
      livecells: null,
      hint: null,
    },

    // Grid style
    grid: {
      current: 0,

      schemes: [
        {
          color: "#F3F3F3",
        },

        {
          color: "#FFFFFF",
        },

        {
          color: "#666666",
        },

        {
          color: "", // Special case: 0px grid
        },
      ],
    },

    // Zoom level
    zoom: {
      current: 0,
      schedule: false,

      schemes: [
        // { columns : 100, rows : 48, cellSize : 8 },
        {
          columns: 180,
          rows: 86,
          cellSize: 8,
        },

        {
          columns: 300,
          rows: 144,
          cellSize: 2,
        },

        {
          columns: 450,
          rows: 216,
          cellSize: 1,
        },
      ],
    },

    // Cell colors
    colors: {
      current: 0,
      schedule: false,

      schemes: [
        {
          dead: "#FFFFFF",
          alive: ["#95E0A2", "#40C463", "#30A14E"],
        },

        {
          dead: "#FFFFFF",
          alive: [
            "#FF0000",
            "#FF7F00",
            "#FFFF00",
            "#008000 ",
            "#0000FF",
            "#4B0082",
            "#EE82EE",
          ],
        },

        {
          dead: "#FFFFFF",
          alive: ["#000000"],
        },
      ],
    },

    /**
     * On Load Event
     */
    init: function () {
      try {
        window.addEventListener("resize", function () {
          GOL.cleanUp();
          GOL.init();
        });
        this.listLife.init(); // Reset/init algorithm
        this.loadConfig(); // Load config from URL (autoplay, colors, zoom, ...)
        this.loadState(); // Load state from URL
        this.canvas.init(); // Init canvas GUI

        this.prepare();
      } catch (e) {
        alert("Error: " + e);
      }
    },

    // Manually load configuration
    loadConfig: function () {
      var colors, grid, zoom;

      this.autoplay = GOL.autoplay;

      // Initial color config
      colors = parseInt(1);
      if (isNaN(colors) || colors < 1 || colors > GOL.colors.schemes.length) {
        colors = 1;
      }

      // Initial grid config
      grid = parseInt(4);
      if (isNaN(grid) || grid < 1 || grid > GOL.grid.schemes.length) {
        grid = 1;
      }

      // Initial zoom config
      zoom = parseInt(1);
      if (isNaN(zoom) || zoom < 1 || zoom > GOL.zoom.schemes.length) {
        zoom = 1;
      }

      this.colors.current = colors - 1;
      this.grid.current = grid - 1;
      this.zoom.current = zoom - 1;

      // Sets a custom zoom based on scrollWidth and scrollHeight
      var canvas = document.getElementById("gol");
      GOL.columns = canvas.scrollWidth;
      GOL.rows = canvas.scrollHeight;
      var cellSize = 1; // Smallest possible cell size

      while ((GOL.columns * GOL.rows) / cellSize > GOL.maxCells) {
        GOL.columns /= 2;
        GOL.rows /= 2;
        cellSize *= 2;
      }

      this.zoom.schemes[this.zoom.current].rows = GOL.rows;
      this.zoom.schemes[this.zoom.current].columns = GOL.columns;
      this.zoom.schemes[this.zoom.current].cellSize = cellSize;

      this.rows = this.zoom.schemes[this.zoom.current].rows;
      this.columns = this.zoom.schemes[this.zoom.current].columns;
    },

    // Manually load state - by default random
    loadState: function () {
      this.randomState();
    },

    /**
     * Create a random pattern
     */
    randomState: function () {
      var i,
        liveCells = this.rows * this.columns * 0.12;

      for (i = 0; i < liveCells; i++) {
        this.listLife.addCell(
          this.helpers.random(0, this.columns - 1),
          this.helpers.random(0, this.rows - 1),
          this.listLife.actualState
        );
      }

      this.listLife.nextGeneration();
    },

    /**
     * Clean up actual state and prepare a new run
     */
    cleanUp: function () {
      this.listLife.init(); // Reset/init algorithm
      this.prepare();
    },

    /**
     * Prepare DOM elements and Canvas for a new run
     */
    prepare: function () {
      this.generation = this.times.algorithm = this.times.gui = 0;
      this.mouseDown = this.clear.schedule = false;

      this.canvas.clearWorld(); // Reset GUI
      this.canvas.drawWorld(); // Draw State

      if (this.autoplay) {
        // Next Flow
        this.autoplay = false;
        this.handlers.buttons.run();
      }
    },

    /**
     * Run Next Step
     */
    nextStep: function () {
      var i, x, y, r, liveCellNumber, algorithmTime, guiTime;

      // Algorithm run

      algorithmTime = new Date();

      liveCellNumber = GOL.listLife.nextGeneration();

      algorithmTime = new Date() - algorithmTime;

      // Canvas run

      guiTime = new Date();

      for (i = 0; i < GOL.listLife.redrawList.length; i++) {
        x = GOL.listLife.redrawList[i][0];
        y = GOL.listLife.redrawList[i][1];

        if (GOL.listLife.redrawList[i][2] === 1) {
          GOL.canvas.changeCelltoAlive(x, y);
        } else if (GOL.listLife.redrawList[i][2] === 2) {
          GOL.canvas.keepCellAlive(x, y);
        } else {
          GOL.canvas.changeCelltoDead(x, y);
        }
      }

      guiTime = new Date() - guiTime;

      // Pos-run updates

      // Change Grid
      if (GOL.grid.schedule) {
        GOL.grid.schedule = false;
        GOL.canvas.drawWorld();
      }

      // Change Colors
      if (GOL.colors.schedule) {
        GOL.colors.schedule = false;
        GOL.canvas.drawWorld();
      }

      // Running Information
      GOL.generation++;

      r = 1.0 / GOL.generation;
      GOL.times.algorithm = GOL.times.algorithm * (1 - r) + algorithmTime * r;
      GOL.times.gui = GOL.times.gui * (1 - r) + guiTime * r;

      // Flow Control
      if (GOL.running) {
        function animateFrame() {
          // stats.begin();
          window.requestAnimationFrame(GOL.nextStep);
          // stats.end();
        }

        if (GOL.waitTime > 0)
          setTimeout(function () {
            animateFrame();
          }, GOL.waitTime);
        else animateFrame();
      } else {
        if (GOL.clear.schedule) {
          GOL.cleanUp();
        }
      }
    },

    /** ****************************************************************************************************************************
     * Event Handlers
     */
    handlers: {
      lastX: 0,
      lastY: 0,

      /**
       *
       */
      canvasMouseMove: function (event) {
        var position = GOL.helpers.mousePosition(event);
        if (
          position[0] !== GOL.handlers.lastX ||
          position[1] !== GOL.handlers.lastY
        ) {
          GOL.canvas.switchCell(position[0], position[1]);
          GOL.handlers.lastX = position[0];
          GOL.handlers.lastY = position[1];
        }
      },

      buttons: {
        /**
         * Button Handler - Run
         */
        run: function () {
          // GOL.element.hint.style.display = 'none';

          GOL.running = !GOL.running;
          if (GOL.running) {
            GOL.nextStep();
          }
        },

        /**
         * Button Handler - Next Step - One Step only
         */
        step: function () {
          if (!GOL.running) {
            GOL.nextStep();
          }
        },

        /**
         * Button Handler - Clear World
         */
        clear: function () {
          if (GOL.running) {
            GOL.clear.schedule = true;
            GOL.running = false;
          } else {
            GOL.cleanUp();
          }
        },

        /**
         *
         */
        colors: function () {
          GOL.colors.current =
            (GOL.colors.current + 1) % GOL.colors.schemes.length;
          if (GOL.running) {
            GOL.colors.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },

        /**
         *
         */
        grid: function () {
          GOL.grid.current = (GOL.grid.current + 1) % GOL.grid.schemes.length;
          if (GOL.running) {
            GOL.grid.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },
      },
    },

    /** ****************************************************************************************************************************
     *
     */
    canvas: {
      context: null,
      width: null,
      height: null,
      age: null,
      cellSize: null,
      cellSpace: null,

      /**
       * init
       */
      init: function () {
        this.canvas = document.getElementById("gol");

        this.context = this.canvas.getContext("2d");

        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize;
        this.cellSpace = 1;

        GOL.helpers.registerEvent(
          document,
          "mousemove",
          GOL.handlers.canvasMouseMove,
          false
        );

        this.clearWorld();
      },

      /**
       * clearWorld
       */
      clearWorld: function () {
        var i, j;

        // Init ages (Canvas reference)
        this.age = [];
        for (i = 0; i < GOL.columns; i++) {
          this.age[i] = [];
          for (j = 0; j < GOL.rows; j++) {
            this.age[i][j] = 0; // Dead
          }
        }
      },

      /**
       * drawWorld
       */
      drawWorld: function () {
        var i, j;

        // Special no grid case
        if (GOL.grid.schemes[GOL.grid.current].color === "") {
          this.setNoGridOn();
          this.width = this.height = 0;
        } else {
          this.setNoGridOff();
          this.width = this.height = 1;
        }

        // Dynamic canvas size
        this.width =
          this.width +
          this.cellSpace * GOL.columns +
          this.cellSize * GOL.columns;
        this.canvas.setAttribute("width", this.canvas.scrollWidth);

        this.height =
          this.height + this.cellSpace * GOL.rows + this.cellSize * GOL.rows;
        this.canvas.setAttribute("height", this.canvas.scrollHeight);

        for (i = 0; i < GOL.columns; i++) {
          for (j = 0; j < GOL.rows; j++) {
            if (GOL.listLife.isAlive(i, j)) {
              this.drawCell(i, j, true);
            } else {
              this.drawCell(i, j, false);
            }
          }
        }
      },

      /**
       * setNoGridOn
       */
      setNoGridOn: function () {
        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize + 1;
        this.cellSpace = 0;
      },

      /**
       * setNoGridOff
       */
      setNoGridOff: function () {
        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize;
        this.cellSpace = 1;
      },

      /**
       * drawCell
       */
      drawCell: function (i, j, alive) {
        if (alive) {
          if (this.age[i][j] > -1) {
            this.context.fillStyle =
              GOL.colors.schemes[GOL.colors.current].alive[
                this.age[i][j] %
                  GOL.colors.schemes[GOL.colors.current].alive.length
              ];
            this.context.fillRect(
              this.cellSpace + this.cellSpace * i + this.cellSize * i,
              this.cellSpace + this.cellSpace * j + this.cellSize * j,
              this.cellSize,
              this.cellSize
            );
          }
        } else
          this.context.clearRect(
            this.cellSpace + this.cellSpace * i + this.cellSize * i,
            this.cellSpace + this.cellSpace * j + this.cellSize * j,
            this.cellSize,
            this.cellSize
          );
      },

      /**
       * switchCell
       */
      switchCell: function (i, j) {
        if (GOL.listLife.isAlive(i, j)) {
          this.changeCelltoDead(i, j);
          GOL.listLife.removeCell(i, j, GOL.listLife.actualState);
        } else {
          this.changeCelltoAlive(i, j);
          GOL.listLife.addCell(i, j, GOL.listLife.actualState);
        }
      },

      /**
       * keepCellAlive
       */
      keepCellAlive: function (i, j) {
        if (i >= 0 && i < GOL.columns && j >= 0 && j < GOL.rows) {
          this.age[i][j]++;
          this.drawCell(i, j, true);
        }
      },

      /**
       * changeCelltoAlive
       */
      changeCelltoAlive: function (i, j) {
        if (i >= 0 && i < GOL.columns && j >= 0 && j < GOL.rows) {
          this.age[i][j] = 1;
          this.drawCell(i, j, true);
        }
      },

      /**
       * changeCelltoDead
       */
      changeCelltoDead: function (i, j) {
        if (i >= 0 && i < GOL.columns && j >= 0 && j < GOL.rows) {
          this.drawCell(i, j, false);
        }
      },
    },

    /** ****************************************************************************************************************************
     *
     */
    listLife: {
      actualState: [],
      redrawList: [],

      /**
       *
       */
      init: function () {
        this.actualState = [];
      },

      nextGeneration: function () {
        var x,
          y,
          i,
          j,
          m,
          n,
          key,
          t1,
          t2,
          alive = 0,
          neighbours,
          deadNeighbours,
          allDeadNeighbours = {},
          newState = [];
        this.redrawList = [];

        for (i = 0; i < this.actualState.length; i++) {
          this.topPointer = 1;
          this.bottomPointer = 1;

          for (j = 1; j < this.actualState[i].length; j++) {
            x = this.actualState[i][j];
            y = this.actualState[i][0];

            // Possible dead neighbours
            deadNeighbours = [
              [x - 1, y - 1, 1],
              [x, y - 1, 1],
              [x + 1, y - 1, 1],
              [x - 1, y, 1],
              [x + 1, y, 1],
              [x - 1, y + 1, 1],
              [x, y + 1, 1],
              [x + 1, y + 1, 1],
            ];

            // Get number of live neighbours and remove alive neighbours from deadNeighbours
            neighbours = this.getNeighboursFromAlive(x, y, i, deadNeighbours);

            // Join dead neighbours to check list
            for (m = 0; m < 8; m++) {
              if (deadNeighbours[m] !== undefined) {
                key = deadNeighbours[m][0] + "," + deadNeighbours[m][1]; // Create hashtable key

                if (allDeadNeighbours[key] === undefined) {
                  allDeadNeighbours[key] = 1;
                } else {
                  allDeadNeighbours[key]++;
                }
              }
            }

            if (!(neighbours === 0 || neighbours === 1 || neighbours > 3)) {
              this.addCell(x, y, newState);
              alive++;
              this.redrawList.push([x, y, 2]); // Keep alive
            } else {
              this.redrawList.push([x, y, 0]); // Kill cell
            }
          }
        }

        // Process dead neighbours
        for (key in allDeadNeighbours) {
          if (allDeadNeighbours[key] === 3) {
            // Add new Cell
            key = key.split(",");
            t1 = parseInt(key[0], 10);
            t2 = parseInt(key[1], 10);

            this.addCell(t1, t2, newState);
            alive++;
            this.redrawList.push([t1, t2, 1]);
          }
        }

        this.actualState = newState;

        return alive;
      },

      topPointer: 1,
      middlePointer: 1,
      bottomPointer: 1,

      /**
       *
       */
      getNeighboursFromAlive: function (x, y, i, possibleNeighboursList) {
        var neighbours = 0,
          k;

        // Top
        if (this.actualState[i - 1] !== undefined) {
          if (this.actualState[i - 1][0] === y - 1) {
            for (k = this.topPointer; k < this.actualState[i - 1].length; k++) {
              if (this.actualState[i - 1][k] >= x - 1) {
                if (this.actualState[i - 1][k] === x - 1) {
                  possibleNeighboursList[0] = undefined;
                  this.topPointer = k + 1;
                  neighbours++;
                }

                if (this.actualState[i - 1][k] === x) {
                  possibleNeighboursList[1] = undefined;
                  this.topPointer = k;
                  neighbours++;
                }

                if (this.actualState[i - 1][k] === x + 1) {
                  possibleNeighboursList[2] = undefined;

                  if (k == 1) {
                    this.topPointer = 1;
                  } else {
                    this.topPointer = k - 1;
                  }

                  neighbours++;
                }

                if (this.actualState[i - 1][k] > x + 1) {
                  break;
                }
              }
            }
          }
        }

        // Middle
        for (k = 1; k < this.actualState[i].length; k++) {
          if (this.actualState[i][k] >= x - 1) {
            if (this.actualState[i][k] === x - 1) {
              possibleNeighboursList[3] = undefined;
              neighbours++;
            }

            if (this.actualState[i][k] === x + 1) {
              possibleNeighboursList[4] = undefined;
              neighbours++;
            }

            if (this.actualState[i][k] > x + 1) {
              break;
            }
          }
        }

        // Bottom
        if (this.actualState[i + 1] !== undefined) {
          if (this.actualState[i + 1][0] === y + 1) {
            for (
              k = this.bottomPointer;
              k < this.actualState[i + 1].length;
              k++
            ) {
              if (this.actualState[i + 1][k] >= x - 1) {
                if (this.actualState[i + 1][k] === x - 1) {
                  possibleNeighboursList[5] = undefined;
                  this.bottomPointer = k + 1;
                  neighbours++;
                }

                if (this.actualState[i + 1][k] === x) {
                  possibleNeighboursList[6] = undefined;
                  this.bottomPointer = k;
                  neighbours++;
                }

                if (this.actualState[i + 1][k] === x + 1) {
                  possibleNeighboursList[7] = undefined;

                  if (k == 1) {
                    this.bottomPointer = 1;
                  } else {
                    this.bottomPointer = k - 1;
                  }

                  neighbours++;
                }

                if (this.actualState[i + 1][k] > x + 1) {
                  break;
                }
              }
            }
          }
        }

        return neighbours;
      },

      /**
       *
       */
      isAlive: function (x, y) {
        var i, j;

        for (i = 0; i < this.actualState.length; i++) {
          if (this.actualState[i][0] === y) {
            for (j = 1; j < this.actualState[i].length; j++) {
              if (this.actualState[i][j] === x) {
                return true;
              }
            }
          }
        }
        return false;
      },

      /**
       *
       */
      removeCell: function (x, y, state) {
        var i, j;

        for (i = 0; i < state.length; i++) {
          if (state[i][0] === y) {
            if (state[i].length === 2) {
              // Remove all Row
              state.splice(i, 1);
            } else {
              // Remove Element
              for (j = 1; j < state[i].length; j++) {
                if (state[i][j] === x) {
                  state[i].splice(j, 1);
                }
              }
            }
          }
        }
      },

      /**
       *
       */
      addCell: function (x, y, state) {
        if (state.length === 0) {
          state.push([y, x]);
          return;
        }

        var k,
          n,
          m,
          tempRow,
          newState = [],
          added;

        if (y < state[0][0]) {
          // Add to Head
          newState = [[y, x]];
          for (k = 0; k < state.length; k++) {
            newState[k + 1] = state[k];
          }

          for (k = 0; k < newState.length; k++) {
            state[k] = newState[k];
          }

          return;
        } else if (y > state[state.length - 1][0]) {
          // Add to Tail
          state[state.length] = [y, x];
          return;
        } else {
          // Add to Middle

          for (n = 0; n < state.length; n++) {
            if (state[n][0] === y) {
              // Level Exists
              tempRow = [];
              added = false;
              for (m = 1; m < state[n].length; m++) {
                if (!added && x < state[n][m]) {
                  tempRow.push(x);
                  added = !added;
                }
                tempRow.push(state[n][m]);
              }
              tempRow.unshift(y);
              if (!added) {
                tempRow.push(x);
              }
              state[n] = tempRow;
              return;
            }

            if (y < state[n][0]) {
              // Create Level
              newState = [];
              for (k = 0; k < state.length; k++) {
                if (k === n) {
                  newState[k] = [y, x];
                  newState[k + 1] = state[k];
                } else if (k < n) {
                  newState[k] = state[k];
                } else if (k > n) {
                  newState[k + 1] = state[k];
                }
              }

              for (k = 0; k < newState.length; k++) {
                state[k] = newState[k];
              }

              return;
            }
          }
        }
      },
    },

    /** ****************************************************************************************************************************
     *
     */
    helpers: {
      urlParameters: null, // Cache

      /**
       * Return a random integer from [min, max]
       */
      random: function (min, max) {
        return min <= max
          ? min + Math.round(Math.random() * (max - min))
          : null;
      },

      /**
       * Register Event
       */
      registerEvent: function (element, event, handler, capture) {
        if (/msie/i.test(navigator.userAgent)) {
          element.attachEvent("on" + event, handler);
        } else {
          element.addEventListener(event, handler, capture);
        }
      },

      /**
       *
       */
      mousePosition: function (e) {
        // http://www.malleus.de/FAQ/getImgMousePos.html
        // http://www.quirksmode.org/js/events_properties.html#position
        var event,
          x,
          y,
          domObject,
          posx = 0,
          posy = 0,
          top = 0,
          left = 0,
          cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize + 1;

        event = e;
        if (!event) {
          event = window.event;
        }

        if (event.pageX || event.pageY) {
          posx = event.pageX;
          posy = event.pageY;
        } else if (event.clientX || event.clientY) {
          posx =
            event.clientX +
            document.body.scrollLeft +
            document.documentElement.scrollLeft;
          posy =
            event.clientY +
            document.body.scrollTop +
            document.documentElement.scrollTop;
        }

        domObject = event.target || event.srcElement;

        while (domObject.offsetParent) {
          left += domObject.offsetLeft;
          top += domObject.offsetTop;
          domObject = domObject.offsetParent;
        }

        domObject.pageTop = top;
        domObject.pageLeft = left;

        x = Math.ceil((posx - domObject.pageLeft) / cellSize - 1);
        y = Math.ceil((posy - domObject.pageTop) / cellSize - 1);

        return [x, y];
      },
    },
  };

  /**
   * Init on 'load' event
   */
  GOL.helpers.registerEvent(
    window,
    "load",
    function () {
      GOL.init();
    },
    false
  );
})();
