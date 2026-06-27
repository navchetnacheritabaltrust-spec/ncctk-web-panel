"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/* ============================================
   1. GET DATA (One-time Fetch)
============================================ */
export function useFetchQuery(key, fetchFn) {
    return useQuery({
        queryKey: key,
        queryFn: fetchFn,
    });
}

/* ============================================
   2. REAL-TIME DATA with onSnapshot
============================================ */
export function useLiveQuery(liveFn) {
    const [data, setData] = useState([]);

    useEffect(() => {
        const unsub = liveFn(setData);
        return () => unsub && unsub();
    }, []);

    return { data };
}

/* ============================================
   3. MUTATION (CREATE / UPDATE / DELETE / UPLOAD)
============================================ */
export function useMutationQuery(mutationFn, keyToInvalidate = []) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: () => {
            keyToInvalidate.forEach((key) => {
                queryClient.invalidateQueries([key]);
            });
        },
    });
}
