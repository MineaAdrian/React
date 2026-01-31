"use client";

import { useState } from "react";
import { addManualShoppingItem } from "@/app/actions/shopping";
import { useTranslation } from "@/hooks/useTranslation";

interface AddShoppingItemProps {
    weekStartStr: string;
}

export function AddShoppingItem({ weekStartStr }: AddShoppingItemProps) {
    const { t, language } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [nameRo, setNameRo] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("pcs");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await addManualShoppingItem(weekStartStr, name, Number(quantity), unit, nameRo);
            setName("");
            setNameRo("");
            setQuantity("1");
            setUnit("pcs");
            setIsOpen(false);
        } catch (err) {
            console.error("Failed to add item", err);
            alert("Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
            >
                <span>+</span> {t("shopping_add_item")}
            </button>
        );
    }

    return (
        <div className="card p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    {language === 'ro' ? (
                        <>
                            <div className="sm:col-span-1">
                                <label htmlFor="item-name-ro" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                    {t("recipes_ing_name")} (RO)
                                </label>
                                <input
                                    id="item-name-ro"
                                    type="text"
                                    value={nameRo}
                                    onChange={(e) => setNameRo(e.target.value)}
                                    placeholder="ex. Lapte"
                                    className="input h-10"
                                    autoFocus
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label htmlFor="item-name" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                    {t("recipes_ing_name")} (EN)
                                </label>
                                <input
                                    id="item-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Milk"
                                    className="input h-10"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="sm:col-span-1">
                                <label htmlFor="item-name" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                    {t("recipes_ing_name")} (EN)
                                </label>
                                <input
                                    id="item-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Milk"
                                    className="input h-10"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label htmlFor="item-name-ro" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                    {t("recipes_ing_name")} (RO)
                                </label>
                                <input
                                    id="item-name-ro"
                                    type="text"
                                    value={nameRo}
                                    onChange={(e) => setNameRo(e.target.value)}
                                    placeholder="ex. Lapte"
                                    className="input h-10"
                                />
                            </div>
                        </>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                        <div>
                            <label htmlFor="item-qty" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                {t("recipes_qty")}
                            </label>
                            <input
                                id="item-qty"
                                type="number"
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="input h-10"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="item-unit" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                {t("recipes_unit")}
                            </label>
                            <input
                                id="item-unit"
                                type="text"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="pcs, g, ml..."
                                className="input h-10"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="btn-ghost text-sm h-10 px-4"
                    >
                        {t("recipes_cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary text-sm h-10 px-6"
                    >
                        {loading ? t("shopping_adding") : t("shopping_add_action")}
                    </button>
                </div>
            </form>
        </div>
    );
}
