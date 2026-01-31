import { useLanguageStore } from "@/store/languageStore";
import { translations, TranslationKey } from "@/lib/translations";

export function useTranslation() {
    const { language, setLanguage } = useLanguageStore();

    const t = (key: TranslationKey | string): string => {
        // If key is not in translations, return it as is or handle appropriately
        const dict = translations[language] as Record<string, string>;
        return dict[key] || key;
    };

    return { t, language, setLanguage };
}
