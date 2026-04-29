// Reusable search bar for document filtering.
function SearchBar({ query, onQueryChange, onSearch }) {
    return (
        <div className="card">
            <label htmlFor="search">Search keyword</label>
            <input
                id="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Type a keyword like invoice"
            />
            <button onClick={onSearch}>Search</button>
        </div>
    );
}


export default SearchBar;
