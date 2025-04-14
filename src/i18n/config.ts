import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files
import translationEN from "./locales/en/translation.json";
import translationZH from "./locales/zh/translation.json";

const resources = {
    en: {
        translation: translationEN,
    },
    zh: {
        translation: translationZH,
    },
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: "en", // default language
        fallbackLng: "en",
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        // Enable debug mode for development
        debug: process.env.NODE_ENV === "development",
    });

export default i18n;
