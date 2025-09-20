import { useState, useEffect } from "react";

import {
    setLanguage,
    tStore,
    getAvailableLanguages,
    getCurrentLanguage,
} from "tradux"

function App() {
    const [t, setT] = useState({});
    const [languages, setLanguages] = useState([]);
    const [currentLanguage, setCurrentLanguage] = useState("");

    useEffect(() => {
        getAvailableLanguages().then(setLanguages);
        setCurrentLanguage(getCurrentLanguage());

        return tStore.subscribe(setT);
    }, []);

    const changeLanguage = async (e) => {
        await setLanguage(e.target.value);
        setCurrentLanguage(getCurrentLanguage());
    };

    return (
        <div>
            <h1>React</h1>
            <h2>{t.welcome}</h2>
            <p>{t.navigation?.home}</p>
            <p>{t.navigation?.about}</p>
            <p>{t.navigation?.services}</p>

            <select value={currentLanguage} onChange={changeLanguage}>
                {languages.map(lang => (
                    <option key={lang} value={lang}>
                        {lang}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default App;
