import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Recipe, ShoppingItem } from "@/types";

export async function downloadRecipePdf(recipe: Recipe, language: "en" | "ro" = "en") {
    const doc = new jsPDF();
    const MARGIN = 20;
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const name = (language === "ro" && recipe.name_ro) ? recipe.name_ro : recipe.name;
    const instructions = (language === "ro" && recipe.instructions_ro) ? recipe.instructions_ro : recipe.instructions;

    let cursorY = 25;

    // Title
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80); // Sage Dark
    doc.text(name, MARGIN, cursorY);
    cursorY += 10;

    // Metadata line
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    const mealTypes = Array.isArray(recipe.meal_type) ? (Array.isArray(recipe.meal_type) ? recipe.meal_type.join(", ") : recipe.meal_type) : recipe.meal_type;
    const metaText = `${String(mealTypes).toUpperCase()} | ${recipe.cooking_time_minutes ? `${recipe.cooking_time_minutes} MINS` : ""} | ${recipe.difficulty?.toUpperCase() || ""}`;
    doc.text(metaText, MARGIN, cursorY);
    cursorY += 15;

    // Ingredients Heading
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(language === "ro" ? "Ingrediente" : "Ingredients", MARGIN, cursorY);
    cursorY += 5;

    const ingredientData = recipe.ingredients.map((ing, i) => {
        const ingName = (language === "ro" && (ing.name_ro || recipe.ingredients_ro?.[i]?.name)) ? (ing.name_ro || recipe.ingredients_ro?.[i]?.name) : ing.name;
        return [ingName || "", `${ing.quantity || ""} ${ing.unit || ""}`];
    });

    autoTable(doc, {
        startY: cursorY,
        head: [[language === "ro" ? "Ingredient" : "Ingredient", language === "ro" ? "Cantitate" : "Quantity"]],
        body: ingredientData,
        theme: "striped",
        headStyles: { fillColor: [100, 120, 100] }, // Sage Green
        margin: { left: MARGIN, right: MARGIN },
        didDrawPage: (data) => {
            // Update cursorY to after the table
            cursorY = data.cursor?.y || cursorY;
        }
    });

    // Instructions
    const finalTableY = (doc as any).lastAutoTable.finalY || cursorY;
    cursorY = finalTableY + 15;

    // Check if we need a new page for the instructions header
    if (cursorY > PAGE_HEIGHT - 30) {
        doc.addPage();
        cursorY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(language === "ro" ? "Instrucțiuni" : "Instructions", MARGIN, cursorY);
    cursorY += 10;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const splitInstructions = doc.splitTextToSize(instructions || "", 210 - (MARGIN * 2));

    // Loop through lines and handle page breaks
    splitInstructions.forEach((line: string) => {
        if (cursorY > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            cursorY = MARGIN;
        }
        doc.text(line, MARGIN, cursorY);
        cursorY += 7; // Line height
    });

    // Save
    doc.save(`${name.replace(/\s+/g, "_")}_Recipe.pdf`);
}

export async function downloadShoppingListPdf(
    items: ShoppingItem[],
    weekRangeStr: string,
    language: "en" | "ro" = "en"
) {
    const doc = new jsPDF();
    const MARGIN = 20;
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    let cursorY = 25;

    // Title
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text(language === "ro" ? "Listă Cumpărături" : "Shopping List", MARGIN, cursorY);
    cursorY += 10;

    // Week Range
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(weekRangeStr, MARGIN, cursorY);
    cursorY += 15;

    // Separate checked and unchecked items
    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);

    const prepareRows = (list: ShoppingItem[]) => list.map(item => {
        const name = (language === "ro" && item.ingredient_name_ro) ? item.ingredient_name_ro : item.ingredient_name;
        return [
            item.checked ? "[X] " + name : "[ ] " + name,
            `${item.total_quantity} ${item.unit}`
        ];
    });

    const body = [
        ...prepareRows(unchecked),
        ...(checked.length > 0 ? [
            [{ content: language === "ro" ? "Produse Bifate" : "Completed Items", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
        ] : []),
        ...prepareRows(checked)
    ];

    autoTable(doc, {
        startY: cursorY,
        head: [[language === "ro" ? "Produs" : "Item", language === "ro" ? "Cantitate" : "Quantity"]],
        body: body as any,
        theme: "striped",
        headStyles: { fillColor: [100, 120, 100] },
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 10 },
        didDrawPage: (data) => {
            cursorY = data.cursor?.y || cursorY;
        }
    });

    doc.save(`ShoppingList_${weekRangeStr.replace(/\s+/g, "_")}.pdf`);
}
