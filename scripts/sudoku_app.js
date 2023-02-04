var activeDigit = null;

var undoHistory = [];

var shouldCountdown = false;
var timer;
var timeInSeconds = 0;

var difficulty = "easy";

var erasing = false;
var penciling = false;
var pencil_map;

var starting_cells = [];

init();

function init() {
    generateBoard();

    handlePalette();
    handleBoard();
    handleReset();
    handleTools();

    disablePalette();

    pencil_map = new Map();
}

function generateBoard() {
    var row;
    for (let i = 1; i <= 9; i++) {
        row = document.createElement("tr");
        row.setAttribute("name", "row" + i);

        var cell;
        for (let j = 1; j <= 9; j++) {
            cell = document.createElement("td");
            cell.id = "cell" + i + j;

            // rounded corner styling
            if (i % 3 === 1 && j % 3 === 0) {
                cell.classList.add("board-top-right");
            } else if (i % 3 === 1 && j % 3 === 1) {
                cell.classList.add("board-top-left");
            } else if (i % 3 === 0 && j % 3 === 0) {
                cell.classList.add("board-bottom-right");
            } else if (i % 3 === 0 && j % 3 === 1) {
                cell.classList.add("board-bottom-left");
            }

            // vertical seperators
            if ((j % 3) === 1) {
                let vl = document.createElement("vl");
                row.appendChild(vl);
            }

            row.appendChild(cell);
        }

        // horizontal seperators
        if ((i % 3) === 1 && i != 1) {
            let seperator = document.createElement("hr");
            document.getElementById("board").appendChild(seperator);
        }

        document.getElementById("board").appendChild(row);
    }
}

function populateBoard(digit_string) {
    var row;
    var column;
    var temp;

    starting_cells = [];

    for (var i = 0; i < digit_string.length; i++) {
        if (digit_string.charAt(i) == '.') {
            continue;
        }

        row = 1;
        column = 1;
        temp = i;
        while (temp >= 9) {
            row++;
            temp -= 9;
        }
        column += temp;

        let cell = getCell(row, column);
        cell.innerText = digit_string.charAt(i);
        cell.classList.add("occupied-cell");

        starting_cells.push([row, column]);
    }
}

function handleBoard() {
    for (let cell of getAllCells()) {
        cell.onclick = function() {
            // only handle if there is an active digit and cell is empty
            if (activeDigit != null && penciling) {
                let pos = getRowAndColumn(cell);
                if (pencil_map.has(cell.id)) {
                    let pencil_nums = pencil_map.get(cell.id);
                    if (pencil_nums.includes(activeDigit)) {
                        pencil_nums.splice(pencil_nums.indexOf(activeDigit), 1);

                        if (pencil_nums.length == 0) {
                            pencil_map.delete(cell.id);
                        }
                    } else {
                        pencil_nums.push(activeDigit);
                    }
                } else {
                    pencil_map.set(cell.id, [activeDigit]);
                }

                activeDigit = null;
                resetPaletteActive();
                appendPencilNums();
                displayValidMoves();
                document.getElementById("eraser").removeAttribute("data-disabled");
            } else if (activeDigit != null && !penciling && !cell.classList.contains("occupied-cell")) {
                // start timer if board is empty
                var isEmpty = true;
                for (let cell2 of getAllCells()) {
                    if (cell2.innerText) {
                        isEmpty = false;
                    }
                }

                if (!shouldCountdown) {
                    shouldCountdown = true;
                    
                    // reset timer in case it's already running for some reason
                    stopTimer();

                    startTimer();
                    document.getElementById("timer").classList.add("active-timer");
                }

                // store pencil content
                var pencil_nums = [];
                if (pencil_map.has(cell.id)) {
                    pencil_nums = pencil_map.get(cell.id);
                    pencil_map.delete(cell.id);
                    for (let child of cell.children) {
                        cell.removeChild(child);
                    }
                }

                // store previous value for history
                let previous = cell.innerHTML;
                
                // update cell
                cell.innerText = activeDigit;
                cell.classList.add("occupied-cell");

                // add move to history (for undo)
                let cellPos = getRowAndColumn(cell);
                
                undoHistory.push({
                    "previous": previous,
                    "new": activeDigit,
                    "row": cellPos[0],
                    "column": cellPos[1],
                    "pencil": pencil_nums
                });

                // validate cell
                checkValidMove(activeDigit, cellPos[0], cellPos[1]);

                // reset palette and selections
                activeDigit = null;
                resetPaletteActive();
                toggleUseableDigits();

                disablePointers();
                displayValidMoves();

                removePencilFromOccupied();

                document.getElementById("pencil").removeAttribute("data-disabled");
                document.getElementById("eraser").removeAttribute("data-disabled");

                // check for win
                if (hasWon()) {
                    stopTimer();
                    setWinner(true);
                    document.getElementById("pencil").setAttribute("data-disabled", "true");
                    document.getElementById("eraser").setAttribute("data-disabled", "true");
                }
            } else if (erasing) {
                let pos = getRowAndColumn(cell);
                for (let starter of starting_cells) {
                    if (starter[0] == pos[0] && starter[1] == pos[1]) {
                        return;
                    }
                }
                cell.innerHTML = "";
                cell.classList.remove("occupied-cell");
                appendPencilNums();
            }
        }
    }
}

function appendPencilNums() {
    for (let cell of getAllCells()) {
        for (let child of cell.children) {
            cell.removeChild(child);
        }
    }
    
    for (const [key, value] of pencil_map.entries()) {
        let cell = document.getElementById(key);

        let pencil_container = document.createElement("div");
        pencil_container.classList.add("pencil-container");

        for (let num of value) {
            let pencil_num = document.createElement("p");
            pencil_num.innerText = num.toString();
            pencil_container.appendChild(pencil_num);
        }

        cell.appendChild(pencil_container);
    }
}

function removePencilFromOccupied() {
    for (let cell of getAllCells()) {
        if (cell.classList.contains("occupied-cell") && pencil_map.has(cell.id)) {
            for (let child of cell.children) {
                cell.removeChild(child);
            }
            pencil_map.delete(cell.id);
        }
    }
}

function handleReset() {
    let easy = document.getElementById("reset-easy");
    easy.onclick = function() {
        difficulty = "easy";
        executeReset();
        toggleResetDropdown();
    }

    let medium = document.getElementById("reset-medium");
    medium.onclick = function() {
        difficulty = "medium";
        executeReset();
        toggleResetDropdown();
    }

    let hard = document.getElementById("reset-hard");
    hard.onclick = function() {
        difficulty = "hard";
        executeReset();
        toggleResetDropdown();
    }

    let reset = document.getElementById("reset");
    reset.onclick = function() {
        toggleResetDropdown();
    }
}

function toggleResetDropdown() {
    document.getElementById("reset-dropdown").classList.toggle("show");
}

function executeReset() {
    for (let cell of getAllCells()) {
        cell.innerText = "";
        cell.classList.remove("occupied-cell");
        cell.classList.remove("error");

        activeDigit = null;
        resetPaletteActive();
        enablePalette(false);
        disablePointers();
        displayValidMoves();
        setWinner(false);

        stopTimer();
        timeInSeconds = 0;
        shouldCountdown = false;
        document.getElementById("timer").innerText = "0:00";

        pencil_map = new Map();
    }

    populateBoard(sudoku.generate(difficulty));
    toggleUseableDigits();
}

// hide dropdown if user clicks outside of menu
window.onclick = function(event) {
    if (!event.target.id.matches("reset")) {
        document.getElementById("reset-dropdown").classList.remove("show");
    }
}

function handlePalette() {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    
    for (let digit of paletteDigits) {
        // special case for undo button
        if (digit.id == "undo") {
            digit.onclick = function() {
                undo();
            }
            continue;
        }

        // special case for tool button {
        if (digit.id == "tools") {
            continue;
        }

        digit.onclick = function() {
            if (!digit.hasAttribute("data-disabled")) {
                if (digit.innerText === activeDigit) {
                    activeDigit = null;
                    resetPaletteActive();
                    disablePointers();
                    displayValidMoves();

                    document.getElementById("pencil").removeAttribute("data-disabled");
                    document.getElementById("eraser").removeAttribute("data-disabled");
                    return;
                }

                // reset active-digit css for other digits
                resetPaletteActive();

                activeDigit = digit.innerText;
                digit.classList.add("selected-digit");

                if (!penciling) {
                    displayPointers();
                }
                displayValidMoves();

                document.getElementById("eraser").setAttribute("data-disabled", "true");
                document.getElementById("eraser").classList.remove("selected");
                erasing = false;
            }
        }
    }
}

function resetPaletteActive() {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    for (let digit of paletteDigits) {
        digit.classList.remove("selected-digit");
    }
}

function disablePalette() {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    for (let digit of paletteDigits) {
        if (digit.id != "undo") {
            digit.setAttribute("data-disabled", "true");
        }
    }
}

function enablePalette(show_all) {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    for (let digit of paletteDigits) {
        if (digit.id != "undo") {
            if (digit.hasAttribute("data-disabled")) {
                digit.removeAttribute("data-disabled");
            }
        }
    }

    if (!show_all) {
        toggleUseableDigits();
    }
}

function toggleUseableDigits() {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    for (let digit of paletteDigits) {
        if (digit.id != "undo") {
            if (countDigits(digit.innerHTML) == 9) {
                digit.setAttribute("data-disabled", "true");
            }
        }
    }
}

function displayPointers() {
    for (let cell of getAllCells()) {
        if (!cell.innerHTML) {
            cell.classList.add("clickable");
        }
    }
}

function disablePointers() {
    for (let cell of getAllCells()) {
        cell.classList.remove("clickable");
    }
}

function enableBlankPointers() {
    for (let cell of getAllCells()) {
        if (!cell.classList.contains("occupied-cell")) {
            cell.classList.add("clickable");
        }
    }
}

function undo() {
    // skip if there is nothing to undo
    if (!undoHistory || undoHistory.length === 0) {
        return;
    }

    lastMove = undoHistory.pop();
    let cell = getCell(lastMove.row, lastMove.column);
    cell.innerText = lastMove.previous;

    if (!lastMove.previous) {
        cell.classList.remove("occupied-cell");
    }

    if (lastMove.pencil.length > 0) {
        pencil_map.set(cell.id, lastMove.pencil);
        appendPencilNums();
    }

    // re-validate previous move
    checkValidMove(lastMove.previous, lastMove.row, lastMove.column);

    if (validateBoard()) {
        enablePalette(false);
    }

    setWinner(hasWon());
    if (!hasWon()) {
        document.getElementById("pencil").removeAttribute("data-disabled");
        document.getElementById("eraser").removeAttribute("data-disabled");

        // start timer again
        shouldCountdown = true;
        stopTimer();
        startTimer();
        document.getElementById("timer").classList.add("active-timer");
    }
}

function handleTools() {
    let eraser = document.getElementById("eraser");
    let pencil = document.getElementById("pencil");

    eraser.onclick = function() {
        if (eraser.hasAttribute("data-disabled")) {
            return;
        }

        penciling = false;
        pencil.classList.remove("selected");

        erasing = !erasing;

        if (erasing) {
            eraser.classList.add("selected");
            displayValidErasables();
            disablePalette();
        } else {
            eraser.classList.remove("selected");
            clearValidErasables();
            enablePalette(false);
        }
    }
    
    pencil.onclick = function() {
        if (pencil.hasAttribute("data-disabled")) {
            return;
        }

        erasing = false;
        eraser.classList.remove("selected");
        clearValidErasables();

        penciling = !penciling;

        if (penciling) {
            pencil.classList.add("selected");
            enableBlankPointers();
            enablePalette(true);
            
            if (activeDigit != null) {
                displayValidMoves();
            }
        } else {
            pencil.classList.remove("selected");
            disablePointers();
            enablePalette(false);

            if (activeDigit != null) {
                displayValidMoves();
                displayPointers();
            }
        }
    }
}

function setWinner(hasWon) {
    for (let cell of getAllCells()) {
        if (hasWon) {
            cell.classList.add("winner");
        } else {
            cell.classList.remove("winner");
        }
    }
}

// Move validation
function checkValidMove(digit, row, column) {
    let cell = getCell(row, column);

    if (checkSameBlock(digit, row, column, false) || checkSameRow(digit, row, false) || checkSameColumn(digit, column, false)) {
        cell.classList.add("error");
        disablePalette();
    } else {
        cell.classList.remove("error");
    }
}

function validateBoard() {
    var isValid = true;
    for (let cell of getAllCells()) {
        if (cell.classList.contains("error")) {
            isValid = false;
        }
    }
    return isValid;
}

function displayValidMoves() {
    for (let cell of getAllCells()) {
        cell.classList.remove("invalid-move");
    }

    for (let cell of getAllCells()) {
        if (!activeDigit) {
            cell.classList.remove("invalid-move");
            continue;
        } else if (cell.classList.contains("occupied-cell")) {
            cell.classList.add("invalid-move");
            continue;
        } else {
            let cellPos = getRowAndColumn(cell);

            if (checkSameBlock(activeDigit, cellPos[0], cellPos[1], true) || checkSameRow(activeDigit, cellPos[0], true) || checkSameColumn(activeDigit, cellPos[1], true)) {
                cell.classList.add("invalid-move");
            } 
        }
    }
}

function clearValidMoves() {
    for (let cell of getAllCells()) {
        cell.classList.remove("invalid-move");
    }
}

function displayValidErasables() {
    clearValidErasables();

    for (let cell of getAllCells()) {
        let pos = getRowAndColumn(cell);
        var erasable = true;

        for (let starter of starting_cells) {
            if (pos[0] == starter[0] && pos[1] == starter[1]) {
                erasable = false;
                break;
            }
        }

        if (!erasable) {
            cell.classList.add("locked");
        }
    }
}

function clearValidErasables() {
    for (let cell of getAllCells()) {
        cell.classList.remove("locked");
    }
}

function checkSameBlock(digit, row, column, preview) {
    let block = getBlock(row, column);

    cellsInBlock = [];

    for (let cell of getAllCells()) {
        if (!cell.innerHTML) {
            continue;
        }

        let cellPos = getRowAndColumn(cell);
        let cellBlock = getBlock(cellPos[0], cellPos[1]);
        if (cellBlock[0] == block[0] && cellBlock[1] == block[1]) {
            cellsInBlock.push(cell);
        }
    }

    return multipleDigits(digit, cellsInBlock, preview);
}

function checkSameRow(digit, row, preview) {
    cellsInRow = [];

    for (let cell of getAllCells()) {
        if (!cell.innerHTML) {
            continue;
        }

        let cellPos = getRowAndColumn(cell);
        if (cellPos[0] == row) {
            cellsInRow.push(cell);
        }
    }

    return multipleDigits(digit, cellsInRow, preview);
}

function checkSameColumn(digit, column, preview) {
    cellsInColumn = [];

    for (let cell of getAllCells()) {
        if (!cell.innerHTML) {
            continue;
        }

        let cellPos = getRowAndColumn(cell);
        if (cellPos[1] == column) {
            cellsInColumn.push(cell);
        }
    }

    return multipleDigits(digit, cellsInColumn, preview);
}

function multipleDigits(digit, cells, preview) {
    var digitCount = 0;
    for (let cell of cells) {
        if (cell.innerHTML == digit) {
            digitCount++;

            if (preview) {
                if (digitCount > 0) {
                    return true;
                }
            } else {
                if (digitCount > 1) {
                    return true;
                }
            }
            
        }
    }

    return false;
}

function countDigits(digit) {
    var digitCount = 0;
    for (let cell of getAllCells()) {
        if (cell.innerHTML == digit) {
            digitCount++;
        }
    }

    return digitCount;
}

function hasWon() {
    for (let cell of getAllCells()) {
        if (!cell.classList.contains("occupied-cell") || cell.classList.contains("error")) {
            return false;
        }
    }
    return true;
}

// Cell Position Helper Functions
function getAllCells() {
    var cells = [];

    var rows = document.getElementById("board").rows;
    for (let row of rows) {
        for (let cell of row.cells) {
            cells.push(cell);
        }
    }

    return cells;
}

function getCell(row, column) {
    return document.getElementById("cell" + row + column);
}

function getRowAndColumn(cell) {
    let cellName = cell.id;
    let cellRow = cellName.charAt(cellName.length - 2);
    let cellColumn = cellName.charAt(cellName.length - 1);

    return [cellRow, cellColumn];
}

function getCondensedRowAndColumn(row, column) {
    return "" + row + column;
}

function getCondensedRowAndColumn(cell) {
    return getCondensedRowAndColumn(getRowAndColumn(cell));
}

function getBlock(row, column) {
    let blockRow = Math.floor((row - 1) / 3) + 1;
    let blockCol = Math.floor((column - 1) / 3) + 1;

    return [blockRow, blockCol];
}

// Timer
function startTimer() {
    timer = setInterval(function() {
        timeInSeconds++;

        document.getElementById("timer").innerText = formatTime(timeInSeconds);
        
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    document.getElementById("timer").classList.remove("active-timer");
}

// thank you Tom Esterez
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    return [
      h,
      m > 9 ? m : (h ? '0' + m : m || '0'),
      s > 9 ? s : '0' + s
    ].filter(Boolean).join(':');
}