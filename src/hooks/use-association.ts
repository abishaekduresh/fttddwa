"use client";

import { useState, useEffect } from "react";

export interface AssociationSettings {
  id: number;
  name: string;
  nameTamil?: string;
  shortName: string;
  shortNameTamil?: string;
  tagline?: string;
  taglineTamil?: string;
  logo1Url?: string;
  logo2Url?: string;
  regNumber?: string;
  address?: string;
  addressTamil?: string;
  state?: string;
  stateTamil?: string;
  email?: string;
  phone?: string;
}

// Simple in-memory cache for the session
let cachedSettings: AssociationSettings | null = null;

export function useAssociation() {
  const [settings, setSettings] = useState<AssociationSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) return;

    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/association");
        const json = await res.json();
        if (json.success) {
          cachedSettings = json.data;
          setSettings(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch association settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
