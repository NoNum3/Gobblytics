import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div style={{ textAlign: "center", margin: "1rem 0" }}>
            <span style={{ marginRight: "10px" }}>{t("language")}:</span>
            <button
                onClick={() => changeLanguage("en")}
                disabled={i18n.language === "en"}
            >
                English
            </button>
            <button
                onClick={() => changeLanguage("zh")}
                disabled={i18n.language === "zh"}
                style={{ marginLeft: "5px" }}
            >
                中文
            </button>
        </div>
    );
};

export default LanguageSwitcher;
