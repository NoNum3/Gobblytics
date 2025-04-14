import React from "react";
import { useTranslation } from "react-i18next";

interface AIMoveExplanationProps {
    explanation: string | null;
    isThinking: boolean;
}

const AIMoveExplanation: React.FC<AIMoveExplanationProps> = ({
    explanation,
    isThinking,
}) => {
    const { t } = useTranslation();

    if (isThinking) {
        return (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
                <div className="flex items-center">
                    <svg
                        className="w-5 h-5 mr-2 text-blue-500 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        >
                        </circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        >
                        </path>
                    </svg>
                    <span className="text-blue-700 font-medium">
                        {t("aiThinking")}
                    </span>
                </div>
            </div>
        );
    }

    if (!explanation) {
        return null;
    }

    return (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium mb-2 text-blue-800">
                {t("aiMoveExplanation")}
            </h3>
            <p className="text-sm text-blue-900">{explanation}</p>
        </div>
    );
};

export default AIMoveExplanation;
