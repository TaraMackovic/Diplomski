import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/FilterPanel.css";

function FilterPanel({ filters, onApply, onClose }) {
    const [draft, setDraft] = useState(filters);
    const [categories, setCategories] = useState([]);
    const [showAllCategories, setShowAllCategories] = useState(false);

    const VISIBLE_CATEGORIES = 6;

    useEffect(() => {
        setDraft(filters);
    }, [filters]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await api.get("/categories/");
            setCategories(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const toggleCategory = (id) => {
        setDraft((prev) => {
            const has = prev.categories.includes(id);
            return {
                ...prev,
                categories: has
                    ? prev.categories.filter((c) => c !== id)
                    : [...prev.categories, id],
            };
        });
    };

    const handleReset = () => {
        const resetFilters = {
            sort: null,
            dateOption: "any",
            customDateFrom: "",
            customDateTo: "",
            categories: [],
            onlyFree: false,
        };

        setDraft(resetFilters);
        onApply(resetFilters);
        onClose();
    };

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const visibleCategories = showAllCategories
        ? categories
        : categories.slice(0, VISIBLE_CATEGORIES);

    return (
        <div className="filter-panel">
            <div className="filter-panel-header">
                <button className="filter-back-btn" onClick={onClose}>‹</button>
                <h2>Sort & filter</h2>
            </div>

            <div className="filter-panel-body">
                {/* SORTIRAJ PO */}
                <div className="filter-section">
                    <h3>Sortiraj po</h3>

                    <label className="radio-row">
                        <span>A–Z</span>
                        <input
                            type="radio"
                            name="sort"
                            checked={draft.sort === "az"}
                            onChange={() => setDraft({ ...draft, sort: "az" })}
                        />
                    </label>

                    <label className="radio-row">
                        <span>Datum</span>
                        <input
                            type="radio"
                            name="sort"
                            checked={draft.sort === "date"}
                            onChange={() => setDraft({ ...draft, sort: "date" })}
                        />
                    </label>

                    <label className="radio-row">
                        <span>Udaljenost</span>
                        <input
                            type="radio"
                            name="sort"
                            checked={draft.sort === "distance"}
                            onChange={() => setDraft({ ...draft, sort: "distance" })}
                        />
                    </label>
                </div>

                <hr />

                {/* DATUM */}
                <div className="filter-section">
                    <h3>Datum</h3>

                    {[
                        ["any", "Bilo koji datum"],
                        ["today", "Danas"],
                        ["tomorrow", "Sutra"],
                        ["week", "Ove sedmice"],
                        ["weekend", "Ovog vikenda"],
                    ].map(([value, label]) => (
                        <label className="radio-row" key={value}>
                            <span>{label}</span>
                            <input
                                type="radio"
                                name="dateOption"
                                checked={draft.dateOption === value}
                                onChange={() => setDraft({ ...draft, dateOption: value })}
                            />
                        </label>
                    ))}

                    <label className="radio-row">
                        <span>Odaberi datum</span>
                        <input
                            type="radio"
                            name="dateOption"
                            checked={draft.dateOption === "custom"}
                            onChange={() => setDraft({ ...draft, dateOption: "custom" })}
                        />
                    </label>

                    {draft.dateOption === "custom" && (
                        <div className="custom-date-row">
                            <input
                                type="date"
                                value={draft.customDateFrom}
                                onChange={(e) =>
                                    setDraft({ ...draft, customDateFrom: e.target.value })
                                }
                            />
                            <span>do</span>
                            <input
                                type="date"
                                value={draft.customDateTo}
                                onChange={(e) =>
                                    setDraft({ ...draft, customDateTo: e.target.value })
                                }
                            />
                        </div>
                    )}
                </div>

                <hr />

                {/* KATEGORIJA */}
                <div className="filter-section">
                    <h3>Kategorija</h3>

                    {visibleCategories.map((cat) => (
                        <label className="checkbox-row" key={cat.id}>
                            <span>{cat.name}</span>
                            <input
                                type="checkbox"
                                checked={draft.categories.includes(cat.id)}
                                onChange={() => toggleCategory(cat.id)}
                            />
                        </label>
                    ))}

                    {categories.length > VISIBLE_CATEGORIES && (
                        <button
                            className="show-more-btn"
                            onClick={() => setShowAllCategories(!showAllCategories)}
                        >
                            {showAllCategories ? "Prikaži manje ⌃" : "Prikaži više ⌄"}
                        </button>
                    )}
                </div>

                <hr />

                {/* CIJENA */}
                <div className="filter-section">
                    <h3>Cijena ulaznice</h3>

                    <label className="switch-row">
                        <span>Besplatni događaji</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={draft.onlyFree}
                                onChange={() => setDraft({ ...draft, onlyFree: !draft.onlyFree })}
                            />
                            <span className="slider"></span>
                        </label>
                    </label>
                </div>
            </div>

            <div className="filter-panel-footer">
                <button className="reset-btn" onClick={handleReset}>
                    Reset
                </button>
                <button className="apply-btn" onClick={handleApply}>
                    Filtriraj
                </button>
            </div>
        </div>
    );
}

export default FilterPanel;