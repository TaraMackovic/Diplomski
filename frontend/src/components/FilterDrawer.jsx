import FilterPanel from "./FilterPanel";
import "../styles/FilterDrawer.css";

function FilterDrawer({ isOpen, onClose, filters, onApply }) {
    if (!isOpen) return null;

    return (
        <div className="filter-drawer-overlay" onClick={onClose}>
            <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
                <FilterPanel filters={filters} onApply={onApply} onClose={onClose} />
            </div>
        </div>
    );
}

export default FilterDrawer;