handleBackgroundIcons();

function handleBackgroundIcons() {
    document.getElementById("menu-sudoku").addEventListener("mouseenter", (event) => {
        document.getElementById("menu-background-sudoku").classList.add("hover");
    });

    document.getElementById("menu-sudoku").addEventListener("mouseleave", (event) => {
        document.getElementById("menu-background-sudoku").classList.remove("hover");
    });

    document.getElementById("menu-minecraft").addEventListener("mouseenter", (event) => {
        document.getElementById("menu-background-minecraft").classList.add("hover");
    });

    document.getElementById("menu-minecraft").addEventListener("mouseleave", (event) => {
        document.getElementById("menu-background-minecraft").classList.remove("hover");
    });
}