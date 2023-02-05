/*             *
 *    Board    * 
 *             */
var board;
var starting_cells;

/*             *
 *   Palette   * 
 *             */
var activeDigit = null;
var pencil = false;
var eraser = false;
var pencil_map;

/*            *
 *    Undo    * 
 *            */
var undo_history;

/*             *
 *   Toggles   * 
 *             */
var show_errors;
var show_placement_helper;
var show_completed_numbers;
var undo_pencil;
var unselect_after_placement;
var unselect_pencil_after_placement;
var dark_mode;

init();

function init() {
    generateBoard();

    initializeVars();
    initializeToggles();

    handleBoard();
    handlePalette();
    handleTools();
    handleReset();
    
    handleSidebar();
    handleToggles();

    enablePalette(false, false);
    enableTools(false, false);
}

function initializeVars() {
    undo_history = [];
    starting_cells = [];
    pencil_map = new Map();
}

function initializeToggles() {
    show_errors = false;
    show_placement_helper = false;
    show_completed_numbers = true;
    undo_pencil = true;
    unselect_after_placement = true;
    unselect_pencil_after_placement = false;
    dark_mode = true;

    document.getElementById("toggle-errors").checked = show_errors;
    document.getElementById("toggle-placement-helper").checked = show_placement_helper;
    document.getElementById("toggle-completed-numbers").checked = show_completed_numbers;
    document.getElementById("toggle-undo-pencil").checked = undo_pencil;
    document.getElementById("toggle-unselect").checked = unselect_after_placement;
    document.getElementById("toggle-unselect-pencil").checked = unselect_pencil_after_placement;
    document.getElementById("toggle-dark-mode").checked = dark_mode;
}

function generateBoard() {
    // Initialize board array
    board = [];
    for (let i = 1; i <= 9; i++) {
        board.push(".........")
    }

    // Initialize board visuals
    var row;
    for (let i = 1; i <= 9; i++) {
        row = document.createElement("tr");
        row.setAttribute("name", "row" + i);

        var cell;
        for (let j = 1; j <= 9; j++) {
            cell = document.createElement("td");
            cell.id = "cell" + i + j;

            // Add pencil slots
            var pencil_container = document.createElement("table");
            pencil_container.classList.add("pencil-container");
            var pencil_row;
            for (let k = 0; k < 3; k++) {
                pencil_row = document.createElement("tr");
                pencil_row.setAttribute("name", "pencil-row" + (k + 1));

                pencil_container.appendChild(pencil_row);
            }
            cell.appendChild(pencil_container);

            // Rounded corner styling
            if (i % 3 === 1 && j % 3 === 0) {
                cell.classList.add("board-top-right");
            } else if (i % 3 === 1 && j % 3 === 1) {
                cell.classList.add("board-top-left");
            } else if (i % 3 === 0 && j % 3 === 0) {
                cell.classList.add("board-bottom-right");
            } else if (i % 3 === 0 && j % 3 === 1) {
                cell.classList.add("board-bottom-left");
            }

            // Vertical seperators
            if ((j % 3) === 1) {
                let vl = document.createElement("vl");
                row.appendChild(vl);
            }

            row.appendChild(cell);
        }

        // Horizontal seperators
        if ((i % 3) === 1 && i != 1) {
            let seperator = document.createElement("hr");
            document.getElementById("board").appendChild(seperator);
        }

        document.getElementById("board").appendChild(row);
    }
}

function updateBoardDisplay() {
    var cell;
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            cell = document.getElementById("cell" + i + j);

            if (board[i - 1].charAt(j - 1) == ".") {
                cell.innerText = "";
                cell.classList.remove("occupied-cell");

                if (pencil_map.has(cell.id)) {
                    addPencilNumbers(cell);
                    for (let num of pencil_map.get(cell.id)) {
                        document.getElementById("cell" + i + j + "-pencil" + num).textContent = num;
                    }
                }
            } else {
                cell.innerText= board[i - 1].charAt(j - 1);
                cell.classList.add("occupied-cell");
            }
        }
    }
}

function addPencilNumbers(cell) {
    // Add pencil slots
    var pencil_container = document.createElement("table");
    pencil_container.classList.add("pencil-container");
    var pencil_row;
    for (let k = 0; k < 3; k++) {
        pencil_row = document.createElement("tr");
        pencil_row.setAttribute("name", "pencil-row" + (k + 1));

        var pencil;
        for (let l = 0; l < 3; l++) {
            pencil = document.createElement("td");
            pencil.id= cell.id + "-pencil" + (k * 3 + l + 1);
            pencil.classList.add("pencil-num");
            pencil.classList.add("pencil" + (k * 3 + l + 1));

            pencil_row.appendChild(pencil);
        }

        pencil_container.appendChild(pencil_row);
    }
    cell.appendChild(pencil_container);

}

function loadGame(digit_string) {
    let split = digit_string.match(/.{1,9}/g || []);
    board = split;

    starting_cells = [];
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) != ".") {
                starting_cells.push([i, j]);
            }
        }
    }

    updateBoardDisplay();
}

function handleBoard() {
    for (let cell of getAllCells()) {
        cell.onclick = function() {
            let pos = getCellPosition(cell);
            if (activeDigit != null && pencil) { // Pencil
                // Prepare for history
                var previous_pencil = getPencil(cell);

                // Update pencil
                updatePencil(cell);

                // Add to history
                if (undo_pencil) {
                    undo_history.push({
                        "type": "pencil",
                        "previous": previous_pencil,
                        "new": getPencil(cell),
                        "row": pos[0],
                        "column": pos[1]
                    });
                }

                // Reset palette and selections
                if (unselect_pencil_after_placement) {
                    activeDigit = null;
                    resetPaletteActive();
                }
            } else if (activeDigit != null && !pencil && !cell.classList.contains("occupied-cell")) { // Standard functionality
                // Prepare for history
                let previous = board[pos[0] - 1].charAt(pos[1] - 1);
                let previous_pencil = getPencil(cell);
                var overwrite_pencil = (previous_pencil.length > 0);

                // Update cell
                updateBoard(pos[0], pos[1], activeDigit);
                pencil_map.delete(cell.id);

                // Add to history
                if (!overwrite_pencil) {
                    undo_history.push({
                        "type": "default",
                        "previous": previous,
                        "new": activeDigit,
                        "row": pos[0],
                        "column": pos[1]
                    });
                } else {
                    undo_history.push({
                        "type": "default_overwrite",
                        "previous": previous,
                        "new": activeDigit,
                        "row": pos[0],
                        "column": pos[1],
                        "pencil": previous_pencil
                    });
                }

                // Validate move
                var has_error = false;
                if (show_errors) {
                    if (!checkValidMove(activeDigit, pos[0], pos[1])) {
                        cell.classList.add("error");
                        has_error = true;
                    }
                }

                // Reset palette and selections
                if (unselect_after_placement) {
                    activeDigit = null;
                    resetPaletteActive();
                    enablePalette(true, false);
                    document.getElementById("eraser").removeAttribute("data-disabled");
                } else if (show_completed_numbers) {
                    if (countDigits(activeDigit) >= 9) {
                        activeDigit = null;
                        resetPaletteActive();
                        enablePalette(true, false);
                    }
                }

                if (has_error) {
                    enablePalette(false, false);
                    enableTools(false);
                }

                if (checkWin()) {
                    for (let cell of getAllCells()) {
                        cell.classList.add("win");
                    }
                    enablePalette(false, false);
                    enableTools(false);
                    undo_history = [];
                } else if (checkComplete()) {
                    for (let cell of getAllCells()) {
                        cell.classList.add("incomplete");
                    }
                    enablePalette(false, false);
                    enableTools(false);
                    resetPaletteActive();
                } else if (unselect_after_placement) {
                    displayClickableCells("reset");
                } else if (!unselect_after_placement) {
                    displayClickableCells("default");
                }
            } else if (eraser) { // Eraser
                // Do not erase if this is one of the starting cells
                for (let starter of starting_cells) {
                    if (starter[0] == pos[0] && starter[1] == pos[1]) {
                        return;
                    }
                }

                if (board[pos[0] - 1].charAt(pos[1] - 1) == ".") {
                    var previous_pencil = getPencil(cell);

                    pencil_map.delete("cell" + pos[0] + pos[1]);

                    if (undo_pencil) {
                        undo_history.push({
                            "type": "pencil",
                            "previous": previous_pencil,
                            "new": getPencil(cell),
                            "row": pos[0],
                            "column": pos[1]
                        });
                    }

                    updateBoardDisplay();
                } else {
                    let previous = board[pos[0] - 1].charAt(pos[1] - 1);

                    updateBoard(pos[0], pos[1], ".");

                    undo_history.push({
                        "type": "default",
                        "previous": previous,
                        "new": ".",
                        "row": pos[0],
                        "column": pos[1]
                    });
                }
            }
        }
    }
}

function handlePalette() {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    
    for (let digit of paletteDigits) {
        // Special case of undo button
        if (digit.id == "undo") {
            digit.onclick = function() {
                undo();
            }
            continue;
        } else if (digit.id == "tools") { // Ignore tool button base
            continue;
        }

        digit.onclick = function() {
            // Ignore if palette is disabled
            if (!digit.hasAttribute("data-disabled")) {
                // Reset if we are clicking on already-selected digit
                if (digit.innerHTML == activeDigit) {
                    activeDigit = null;
                    resetPaletteActive();
                    displayClickableCells("reset");
                    enableTools(true);

                    return;
                }

                resetPaletteActive();
                document.getElementById("eraser").setAttribute("data-disabled", "true");

                activeDigit = digit.innerHTML;
                digit.classList.add("selected-digit");

                if (pencil) {
                    displayClickableCells("pencil");
                } else {
                    displayClickableCells("default");
                }
                
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

function enablePalette(enabled, show_all) {
    var paletteDigits = document.getElementById("palette").rows[0].cells;
    for (let digit of paletteDigits) {
        if (digit.id != "undo" && digit.id != "tools") {
            if (enabled) {
                digit.removeAttribute("data-disabled");

                if (!show_all && show_completed_numbers) {
                    if (countDigits(digit.innerHTML) >= 9) {
                        digit.setAttribute("data-disabled", true);
                    }
                }
            } else {
                digit.setAttribute("data-disabled", "true");
            }
        }
    }
}

function enableTools(enabled) {
    if (enabled) {
        document.getElementById("eraser").removeAttribute("data-disabled");
        document.getElementById("pencil").removeAttribute("data-disabled");
    } else {
        document.getElementById("eraser").setAttribute("data-disabled", "true");
        document.getElementById("pencil").setAttribute("data-disabled", "true");
    }
}

function undo() {
    if (!undo_history || undo_history.length === 0) {
        return;
    }

    lastMove = undo_history.pop();
    let cell = document.getElementById("cell" + lastMove.row + lastMove.column);
    if (lastMove.type == "default") {
        updateBoard(lastMove.row, lastMove.column, lastMove.previous);
        pencil_map.delete(cell.id);

        if (!lastMove.previous) {
            cell.classList.remove("occupied-cell");
        }

        if (checkValidMove(lastMove.previous, lastMove.row, lastMove.column)) {
            cell.classList.remove("error");
            enablePalette(true, false);
            enableTools(true);
        }
    } else if (lastMove.type == "default_overwrite") {
        updateBoard(lastMove.row, lastMove.column, lastMove.previous);
        pencil_map.set(cell.id, lastMove.pencil);
        updateBoardDisplay();
    } else if (lastMove.type == "pencil") {
        updateBoard(lastMove.row, lastMove.column, ".");
        pencil_map.set(cell.id, lastMove.previous);
        updateBoardDisplay();
    }

    for (let cell of getAllCells()) {
        cell.classList.remove("incomplete");
    }
}

function handleTools() {
    let pencil_element = document.getElementById("pencil");
    let eraser_element = document.getElementById("eraser");

    pencil_element.onclick = function() {
        if (pencil_element.hasAttribute("data-disabled")) {
            return;
        }

        // Turn off eraser
        eraser = false;
        eraser_element.classList.remove("selected");

        pencil = !pencil;

        if (pencil) {
            pencil_element.classList.add("selected");
            enablePalette(true, false);
            displayClickableCells("pencil");
        } else {
            pencil_element.classList.remove("selected");
            enablePalette(true, false);
            displayClickableCells("reset");

            if (unselect_after_placement) {
                activeDigit = null;
                resetPaletteActive();
            }
        }
    }

    eraser_element.onclick = function() {
        if (eraser_element.hasAttribute("data-disabled")) {
            return;
        }

        // Turn off pencil
        pencil = false;
        pencil_element.classList.remove("selected");

        eraser = !eraser;

        if (eraser) {
            eraser_element.classList.add("selected");
            enablePalette(false, false);
            displayClickableCells("eraser");
        } else {
            eraser_element.classList.remove("selected");
            enablePalette(true, false);
            displayClickableCells("reset");
        }
    }
}

function handleReset() {
    document.getElementById("reset-easy").onclick = function() {
        executeReset("easy");
        toggleResetDropdown();
    }

    document.getElementById("reset-medium").onclick = function() {
        executeReset("medium");
        toggleResetDropdown();
    }

    document.getElementById("reset-hard").onclick = function() {
        executeReset("hard");
        toggleResetDropdown();
    }

    document.getElementById("reset-very-hard").onclick = function() {
        executeReset("very-hard");
        toggleResetDropdown();
    }

    document.getElementById("reset-insane").onclick = function() {
        executeReset("insane");
        toggleResetDropdown();
    }

    document.getElementById("reset-inhuman").onclick = function() {
        executeReset("inhuman");
        toggleResetDropdown();
    }

    document.getElementById("reset").onclick = function() {
        toggleResetDropdown();
    }
}

function executeReset(difficulty) {
    loadGame(sudoku.generate(difficulty));

    activeDigit = null;
    resetPaletteActive();
    enablePalette(true, false);
    enableTools(true);
    displayClickableCells("reset");

    pencil_map = new Map();
    undo_history = [];
}

function toggleResetDropdown() {
    document.getElementById("reset-dropdown").classList.toggle("show");
}

function handleSidebar() {
    document.getElementById("settings-icon").onclick = function() {
        document.getElementById("sidebar").classList.toggle("closed");
    }
}

function handleToggles() {
    document.getElementById("toggle-errors").addEventListener("change", e => {
        show_errors = e.target.checked;
    });

    document.getElementById("toggle-placement-helper").addEventListener("change", e => {
        show_placement_helper = e.target.checked;
    });

    document.getElementById("toggle-completed-numbers").addEventListener("change", e => {
        show_completed_numbers = e.target.checked;
        if (!eraser && !isBoardEmpty()) {
            enablePalette(true, false);
        }
    });

    document.getElementById("toggle-undo-pencil").addEventListener("change", e => {
        undo_pencil = e.target.checked;
    });

    document.getElementById("toggle-unselect").addEventListener("change", e => {
        unselect_after_placement = e.target.checked;
    });

    document.getElementById("toggle-unselect-pencil").addEventListener("change", e => {
        unselect_pencil_after_placement = e.target.checked;
    });

    document.getElementById("toggle-dark-mode").addEventListener("change", e => {
        dark_mode = e.target.checked;
        toggleDarkMode();
    });
}

/*                             *
 *    Game Helper Functions    *
 *                             */
function updateBoard(row, column, number) {
    let old = board[row - 1];
    board[row - 1] = setCharAt(old, column - 1, number);

    updateBoardDisplay();
}

function getPencil(cell) {
    if (pencil_map.has(cell.id)) {
        return pencil_map.get(cell.id).map((x) => x);
    }

    return [];
}

function updatePencil(cell) {
    if (!activeDigit || cell.classList.contains("occupied-cell")) {
        return;
    }

    if (pencil_map.has(cell.id)) { // If there are already numbers in that cell
        var pencil_nums = pencil_map.get(cell.id);
        if (pencil_nums.includes(activeDigit)) { // If number is already pencilled in
            // Remove it
            pencil_nums.splice(pencil_nums.indexOf(activeDigit), 1);

            // If there are no more nums, clear cell from map
            if (pencil_nums.length == 0) {
                pencil_map.delete(cell.id);
            } else {
                pencil_map.set(cell.id, pencil_nums);
            }
        } else {
            // If number is not already pencilled in, add it
            pencil_nums.push(activeDigit);
            pencil_map.set(cell.id, pencil_nums);
        }
    } else { // If cell has no pencil numbers
        pencil_map.set(cell.id, [activeDigit]);
    }

    updateBoardDisplay();
}

function getBlock(row, column) {
    let blockRow = Math.floor((row - 1) / 3) + 1;
    let blockCol = Math.floor((column - 1) / 3) + 1;

    return [blockRow, blockCol];
}

function checkComplete() {
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) == ".") {
                return false;
            }
        }
    }

    return true;
}

function checkWin() {
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) == ".") {
                return false;
            } else if (!checkValidMove(board[i - 1].charAt(j - 1), i, j)) {
                return false;
            }
        }
    }

    return true;
}

function isBoardEmpty() {
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) != ".") {
                return false;
            }
        }
    }

    return true;
}

/*                            *
 *   Board Helper Functions   *
 *                            */
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

function getCellPosition(cell) {
    let cellName = cell.id;
    let cellRow = cellName.charAt(cellName.length - 2);
    let cellColumn = cellName.charAt(cellName.length - 1);

    return [cellRow, cellColumn];
}

function displayClickableCells(type) {
    for (let cell of getAllCells()) {
        let pos = getCellPosition(cell);

        if (type == "eraser") {
            cell.classList.remove("locked");
            cell.classList.add("clickable");

            for (let starter of starting_cells) {
                if (pos[0] == starter[0] && pos[1] == starter[1]) {
                    cell.classList.add("locked");
                    cell.classList.remove("clickable");
                    break;
                }
            }
        } else if (type == "pencil") {
            cell.classList.remove("locked");

            if (cell.classList.contains("occupied-cell")) {
                cell.classList.remove("clickable");
                cell.classList.add("locked");
            } else {
                cell.classList.add("clickable");
            }
        } else if (type == "default") {
            cell.classList.remove("locked");
            cell.classList.remove("invalid-move");

            if (cell.classList.contains("occupied-cell")) {
                cell.classList.remove("clickable");
            } else {
                cell.classList.add("clickable");
            }

            if (show_placement_helper) {
                if ((checkSameBlock(activeDigit, pos[0], pos[1], 1) || checkSameRow(activeDigit, pos[0], 1) || checkSameColumn(activeDigit, pos[1], 1)) || cell.classList.contains("occupied-cell")) {
                    cell.classList.add("invalid-move");
                    cell.classList.remove("clickable");
                }
            }
        } else if (type == "reset") {
            cell.classList.remove("locked");
            cell.classList.remove("clickable");
            cell.classList.remove("invalid-move");
            cell.classList.remove("win");
        }
    }
}

/*                    *
 *   Hint Functions   *
 *                    */
function checkValidMove(digit, row, column) {
    if (checkSameBlock(digit, row, column, 2) || checkSameRow(digit, row, 2) || checkSameColumn(digit, column, 2)) {
        return false;
    }
    return true;
}

function checkSameBlock(digit, row, column, threshold) {
    let block = getBlock(row, column);

    numsInBlock = [];

    var cellBlock;
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) == ".") {
                continue;
            }

            cellBlock = getBlock(i, j);
            if (cellBlock[0] == block[0] && cellBlock[1] == block[1]) {
                numsInBlock.push(board[i - 1].charAt(j - 1));
            }
        }
    }

    var digitCount = 0;
    for (let num of numsInBlock) {
        if (num == digit) {
            digitCount++;

            if (digitCount >= threshold) {
                return true;
            }
        }
    }

    return false;
}

function checkSameRow(digit, row, threshold) {
    var digitCount = 0;
    for (let i = 1; i <= 9; i++) {
        if (board[row - 1].charAt(i - 1) != "." && board[row - 1].charAt(i - 1) == digit) {
            digitCount++;

            if (digitCount >= threshold) {
                return true;
            }
        }
    }

    return false;
}

function checkSameColumn(digit, column, threshold) {
    var digitCount = 0;
    for (let i = 1; i <= 9; i++) {
        if (board[i - 1].charAt(column - 1) != "." && board[i - 1].charAt(column - 1) == digit) {
            digitCount++;

            if (digitCount >= threshold) {
                return true;
            }
        }
    }

    return false;
}

function countDigits(digit) {
    var digitCount = 0;
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            if (board[i - 1].charAt(j - 1) == digit) {
                digitCount++;
            }
        }
    }

    return digitCount;
}

/*                            *
 *   Misc. Helper Functions   *
 *                            */
function setCharAt(str, index, char) {
    if (index > str.length - 1) {
        return str;
    }

    return str.substring(0, index) + char + str.substring(index + 1);
}

function toggleDarkMode() {
    var r = document.querySelector(":root");
    var rs = getComputedStyle(r);
    if (dark_mode) {
        r.style.setProperty("--background-color", rs.getPropertyValue("--darker"));
        r.style.setProperty("--menu-color", rs.getPropertyValue("--dark"));
        r.style.setProperty("--menu-button", rs.getPropertyValue("--darkish"));
        r.style.setProperty("--menu-button-highlight", rs.getPropertyValue("--dark-highlight"));
        r.style.setProperty("--button-hover", rs.getPropertyValue("--darkish"));
        r.style.setProperty("--button-click", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--cell-default", rs.getPropertyValue("--darkish"));
        r.style.setProperty("--cell-locked", rs.getPropertyValue("--dark"));
        r.style.setProperty("--cell-locked-hover", rs.getPropertyValue("--darkish"));
        r.style.setProperty("--cell-hover", rs.getPropertyValue("--dark-highlight"));
        r.style.setProperty("--cell-click", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--text-default", rs.getPropertyValue("--lightest"));
        r.style.setProperty("--text-locked", rs.getPropertyValue("--light"));
        r.style.setProperty("--text-disabled", rs.getPropertyValue("--darker"));
        r.style.setProperty("--text-accent", rs.getPropertyValue("--accent"));
        r.style.setProperty("--accent", rs.getPropertyValue("--pink"));
        r.style.setProperty("--accent-highlight", rs.getPropertyValue("--pink-highlight"));
        r.style.setProperty("--accent-click", rs.getPropertyValue("--pink-click"));
        r.style.setProperty("--accent-disabled", rs.getPropertyValue("--pink-disabled"));
        r.style.setProperty("--switch-background", rs.getPropertyValue("--dark-highlight"));
        r.style.setProperty("--switch", rs.getPropertyValue("--lightest"));
        r.style.setProperty("--win", rs.getPropertyValue("--green"));
        r.style.setProperty("--win-hover", rs.getPropertyValue("--green-highlight"));
        r.style.setProperty("--incomplete", rs.getPropertyValue("--yellow"));
        r.style.setProperty("--incomplete-hover", rs.getPropertyValue("--yellow-highlight"));
    } else {
        r.style.setProperty("--background-color", rs.getPropertyValue("--whiteish"));
        r.style.setProperty("--menu-color", rs.getPropertyValue("--whiter"));
        r.style.setProperty("--menu-button", rs.getPropertyValue("--white"));
        r.style.setProperty("--menu-button-highlight", rs.getPropertyValue("--whitest"));
        r.style.setProperty("--button-hover", rs.getPropertyValue("--whiter"));
        r.style.setProperty("--button-click", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--cell-default", rs.getPropertyValue("--whitest"));
        r.style.setProperty("--cell-locked", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--cell-locked-hover", rs.getPropertyValue("--light"));
        r.style.setProperty("--cell-hover", rs.getPropertyValue("--whiter"));
        r.style.setProperty("--cell-click", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--text-default", rs.getPropertyValue("--darkest"));
        r.style.setProperty("--text-locked", rs.getPropertyValue("--dark-highlight"));
        r.style.setProperty("--text-disabled", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--text-accent", rs.getPropertyValue("--pink-dark"));
        r.style.setProperty("--accent", rs.getPropertyValue("--pink"));
        r.style.setProperty("--accent-highlight", rs.getPropertyValue("--pink-highlight"));
        r.style.setProperty("--accent-click", rs.getPropertyValue("--pink-click"));
        r.style.setProperty("--accent-disabled", rs.getPropertyValue("--pink-disabled"));
        r.style.setProperty("--switch-background", rs.getPropertyValue("--dark-click"));
        r.style.setProperty("--switch", rs.getPropertyValue("--lightest"));
        r.style.setProperty("--win", rs.getPropertyValue("--green-highlight"));
        r.style.setProperty("--win-hover", rs.getPropertyValue("--green-click"));
        r.style.setProperty("--incomplete", rs.getPropertyValue("--yellow"));
        r.style.setProperty("--incomplete-hover", rs.getPropertyValue("--yellow-highlight"));
    }
}

// Close menus when clicking off of them
window.addEventListener("click", function(event) {
    if (!this.document.getElementById("reset").contains(event.target) && document.getElementById("reset-dropdown").classList.contains("show")) {
        document.getElementById("reset-dropdown").classList.remove("show");
    } else if (!this.document.getElementById("sidebar").contains(event.target) && !document.getElementById("sidebar").classList.contains("closed")) {
        document.getElementById("sidebar").classList.add("closed");
    }
});

