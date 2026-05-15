import { useState, useRef, useEffect } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { MUTED_LABEL } from "@/lib/styles";
import type { GeocodeResult } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, MapPin, X } from "lucide-react";

interface LocationSearchProps {
  currentLocation: string;
  onLocationSelect: (location: GeocodeResult) => void;
  onReset: () => void;
}

const SEARCH_CLASSES = {
  container:    "relative",
  inputRow:     "flex items-center gap-2",
  inputWrap:    "relative flex-1",
  inputIcon:    "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
  input:        "pl-9 h-9",
  dropdown:     "absolute top-full left-0 right-0 mt-1 z-50 overflow-visible shadow-lg",
  dropdownList: "py-1",
  item:         "w-full text-left px-3 py-2 flex items-center gap-2 hover-elevate",
  itemIcon:     "w-4 h-4 text-muted-foreground shrink-0",
  itemBody:     "min-w-0",
  itemName:     "text-sm font-medium truncate",
  itemRegion:   `${MUTED_LABEL} truncate`,
  loadingCard:  "absolute top-full left-0 right-0 mt-1 z-50 p-3",
  loadingText:  "text-sm text-muted-foreground text-center",
} as const;

export function LocationSearch({ currentLocation, onLocationSelect, onReset }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocations = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setIsOpen(true);
      }
    } catch (e) {
    }
    setIsSearching(false);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(value), SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = (result: GeocodeResult) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onLocationSelect(result);
  };

  return (
    <div ref={containerRef} className={SEARCH_CLASSES.container} data-testid="location-search">
      <div className={SEARCH_CLASSES.inputRow}>
        <div className={SEARCH_CLASSES.inputWrap}>
          <Search className={SEARCH_CLASSES.inputIcon} />
          <Input
            placeholder="Search location..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            className={SEARCH_CLASSES.input}
            data-testid="input-location-search"
          />
        </div>
        {currentLocation !== "Birmingham & Solihull" && (
          <Button size="icon" variant="ghost" onClick={onReset} data-testid="button-reset-location">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className={SEARCH_CLASSES.dropdown}>
          <div className={SEARCH_CLASSES.dropdownList}>
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={SEARCH_CLASSES.item}
                data-testid={`option-location-${result.id}`}
              >
                <MapPin className={SEARCH_CLASSES.itemIcon} />
                <div className={SEARCH_CLASSES.itemBody}>
                  <p className={SEARCH_CLASSES.itemName}>{result.name}</p>
                  <p className={SEARCH_CLASSES.itemRegion}>
                    {[result.region, result.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {isOpen && isSearching && (
        <Card className={SEARCH_CLASSES.loadingCard}>
          <p className={SEARCH_CLASSES.loadingText}>Searching...</p>
        </Card>
      )}
    </div>
  );
}
