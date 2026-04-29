// Highlights matching keyword occurrences inside a text block.
function HighlightedText({ text, keyword }) {
    if (!keyword) {
        return <p>{text}</p>;
    }

    const pattern = new RegExp(`(${keyword})`, "gi");
    const parts = text.split(pattern);

    return (
        <p>
            {parts.map((part, index) => {
                if (part.toLowerCase() === keyword.toLowerCase()) {
                    return <mark key={index}>{part}</mark>;
                }
                return part;
            })}
        </p>
    );
}


export default HighlightedText;
