"use client";

import { useState } from "react";
import { addManualShoppingItem } from "@/app/actions/shopping";

interface AddShoppingItemProps {
    weekStartStr: string;
}

export function AddShoppingItem({ weekStartStr }: AddShoppingItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("pcs");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await addManualShoppingItem(weekStartStr, name, Number(quantity), unit);
            setName("");
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
                className="btn-secondary flex items-center gap-2"
            >
                <span>+</span> Add manual item
            </button>
        );
    }

    return (
        <div className="card p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                        <label htmlFor="item-name" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                            Item Name
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
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                        <div>
                            <label htmlFor="item-qty" className="block text-xs font-medium text-sage-600 uppercase mb-1">
                                Qty
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
                                Unit
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
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary text-sm h-10 px-6"
                    >
                        {loading ? "Adding..." : "Add to List"}
                    </button>
                </div>
            </form>
        </div>
    );
}
