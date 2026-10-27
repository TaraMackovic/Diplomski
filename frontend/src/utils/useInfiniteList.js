import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

export default function useInfiniteList(url, params, pageSize = 15) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const sentinelRef = useRef(null);
    const requestId = useRef(0);
    const loadingMoreRef = useRef(false);
    const paramsRef = useRef(params);
    paramsRef.current = params;

    const paramsKey = JSON.stringify(params);

    // prvo učitavanje / promjena filtera / reload
    useEffect(() => {
        const id = ++requestId.current;
        loadingMoreRef.current = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(false);
                const response = await api.get(url, {
                    params: { ...paramsRef.current, page: 1, page_size: pageSize },
                });
                if (id !== requestId.current) return;
                setItems(response.data.results);
                setPage(1);
                setTotalPages(response.data.meta.total_pages);
            } catch (err) {
                console.log(err);
                if (id !== requestId.current) return;
                setItems([]);
                setError(true);
            } finally {
                if (id === requestId.current) setLoading(false);
            }
        };

        load();
    }, [url, paramsKey, reloadKey, pageSize]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || page >= totalPages) return;

        const id = requestId.current;
        const nextPage = page + 1;

        try {
            loadingMoreRef.current = true;
            setLoadingMore(true);
            const response = await api.get(url, {
                params: { ...paramsRef.current, page: nextPage, page_size: pageSize },
            });
            if (id !== requestId.current) return;
            setItems((prev) => [...prev, ...response.data.results]);
            setPage(nextPage);
            setTotalPages(response.data.meta.total_pages);
        } catch (err) {
            console.log(err);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [url, page, totalPages, pageSize]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || loading || page >= totalPages) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) loadMore();
            },
            { rootMargin: "200px" }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [items.length, loading, page, totalPages, loadMore]);

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    return {
        items,
        loading,
        loadingMore,
        error,
        hasMore: page < totalPages,
        sentinelRef,
        reload,
    };
}