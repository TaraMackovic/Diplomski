import "../styles/Pagination.css";

function getPageNumbers(page, totalPages) {
    const pages = [];
    const range = 1;

    for (let p = 1; p <= totalPages; p++) {
        if (
            p === 1 ||
            p === totalPages ||
            (p >= page - range && p <= page + range)
        ) {
            pages.push(p);
        }
    }

    const withDots = [];
    let prev = 0;

    for (const p of pages) {
        if (p - prev === 2) {
            withDots.push(prev + 1);
        } else if (p - prev > 2) {
            withDots.push("...");
        }
        withDots.push(p);
        prev = p;
    }

    return withDots;
}

function Pagination({ page, totalPages, onChange }) {

    if (totalPages <= 1) return null;

    const pages = getPageNumbers(page, totalPages);

    return (
        <div className="pagination">
            <button disabled={page === 1} onClick={() => onChange(1)}>«</button>
            <button disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>

            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`dots-${i}`} className="pagination-dots">...</span>
                ) : (
                    <button
                        key={p}
                        className={p === page ? "active" : ""}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                )
            )}

            <button disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
            <button disabled={page === totalPages} onClick={() => onChange(totalPages)}>»</button>
        </div>
    );
}

export default Pagination;