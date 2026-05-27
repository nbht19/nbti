import { useEffect, useState } from "react";

const themeIds = ["blue", "mint", "rose", "violet", "amber"] as const;

type ThemeId = (typeof themeIds)[number];

function chooseRandomTheme(): ThemeId {
  const index = Math.floor(Math.random() * themeIds.length);

  return themeIds[index];
}

export function useRandomTheme() {
  const [theme] = useState<ThemeId>(chooseRandomTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
