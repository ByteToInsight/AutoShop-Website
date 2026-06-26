tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-fixed-dim": "#adc6ff", "tertiary": "#ffb786", "surface-container-low": "#1c1b1b",
        "tertiary-fixed-dim": "#ffb786", "on-surface": "#e5e2e1", "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a", "inverse-surface": "#e5e2e1", "on-tertiary-container": "#461f00",
        "secondary-fixed": "#e5e2e1", "inverse-primary": "#005ac2", "outline": "#8c909f",
        "surface-bright": "#3a3939", "secondary-fixed-dim": "#c8c6c5", "tertiary-container": "#df7412",
        "surface-variant": "#353534", "error-container": "#93000a", "on-background": "#e5e2e1",
        "on-tertiary": "#502400", "surface-tint": "#adc6ff", "primary-container": "#4d8eff",
        "on-tertiary-fixed": "#311400", "on-secondary-fixed": "#1c1b1b", "outline-variant": "#424754",
        "surface-dim": "#131313", "on-error": "#690005", "on-secondary-fixed-variant": "#474746",
        "secondary-container": "#474746", "on-primary": "#002e6a", "inverse-on-surface": "#313030",
        "surface-container-highest": "#353534", "on-secondary-container": "#b7b4b4", "primary": "#adc6ff",
        "primary-fixed": "#d8e2ff", "on-primary-fixed-variant": "#004395", "surface-container-lowest": "#0e0e0e",
        "on-error-container": "#ffdad6", "on-tertiary-fixed-variant": "#723600", "secondary": "#c8c6c5",
        "surface": "#131313", "on-surface-variant": "#c2c6d6", "tertiary-fixed": "#ffdcc6",
        "background": "#131313", "on-primary-container": "#00285d", "error": "#ffb4ab",
        "on-primary-fixed": "#001a42", "on-secondary": "#313030"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: { unit: "8px", "margin-mobile": "20px", "margin-desktop": "80px", "container-max": "1440px", gutter: "24px" },
      fontFamily: { "headline-md": ["Manrope"], "body-lg": ["Manrope"], "label-md": ["Manrope"], "display-lg": ["Manrope"], "body-md": ["Manrope"], "headline-lg": ["Manrope"], "display-lg-mobile": ["Manrope"] },
      fontSize: { "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }], "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }], "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "500" }], "display-lg": ["64px", { lineHeight: "72px", letterSpacing: "-0.02em", fontWeight: "700" }], "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }], "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }], "display-lg-mobile": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }] }
    }
  }
};
