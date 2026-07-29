import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useDHLCalculator(zone) {
  const [rates, setRates] = useState([]);
  const [config, setConfig] = useState(null);
  const [qsRates, setQsRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const configRef = doc(db, "shipping_rates", "dhl_belgium");
        const qsRef = doc(db, "shipping_rates", "qs_usa");
        const promises = [getDoc(configRef), getDoc(qsRef)];

        let zoneRef = null;
        if (zone) {
          zoneRef = doc(db, "shipping_rates", "dhl_belgium", "zones", String(zone));
          promises.push(getDoc(zoneRef));
        }

        const snapshots = await Promise.all(promises);
        const [configSnap, qsSnap, zoneSnap] = snapshots;

        if (configSnap.exists()) {
          setConfig(configSnap.data().config || null);
        }
        if (qsSnap.exists()) {
          setQsRates(qsSnap.data().rates || []);
        }
        if (zoneSnap && zoneSnap.exists()) {
          setRates(zoneSnap.data().rates || []);
        } else {
          setRates([]);
        }
      } catch (err) {
        console.error("Error loading shipping rates:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [zone]);

  return { rates, config, qsRates, loading, error };
}
