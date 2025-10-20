import {
	t,
	setLanguage,
	getAvailableLanguages,
	getCurrentLanguage
} from "tradux"

const currentLang = await getCurrentLanguage();

function App() {
	const changeLanguage = async (e) => {
		await setLanguage(e.target.value);
		location.reload();
	};

	return (
		<div>
			<h1>React</h1>
			<h2>{t.welcome}</h2>
			<p>{t.navigation.home}</p>
			<p>{t.navigation.about}</p>
			<p>{t.navigation.services}</p>

			<select value={currentLang} onChange={changeLanguage}>
				{getAvailableLanguages().map(({ name, value }) => (
					<option key={value} value={value}>
						{name}
					</option>
				))}
			</select>
		</div>
	);
}

export default App;
