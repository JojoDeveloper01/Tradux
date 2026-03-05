import { useTradux } from "tradux/react";

export default function StandaloneApp() {
  // The hook automatically initializes the library and locks it!
  const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();

  if (!isReady) return <p>Loading translations...</p>;

  return (
    <div>
      <h1>React</h1>
      <h2>{t.welcome}</h2>
      <p>{t.navigation.home}</p>
      <p>{t.navigation.about}</p>
      <p>{t.navigation.services}</p>
      <select
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {getAvailableLanguages().map(({ name, value }) => (
          <option key={value} value={value}>{name}</option>
        ))}
      </select>
    </div>
  );
}