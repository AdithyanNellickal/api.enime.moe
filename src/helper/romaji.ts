const exempts = ["komi"];

const mappings = [
    {
        from: "Ko",
        to: "Co"
    }
];

export function transform(original: string) {
    return original.split(" ").map(word => {
        for (let exempt of exempts) {
            if (word.toLowerCase().startsWith(exempt.toLowerCase())) return word;
        }

        mappings.forEach(mapping => {
            word = word.replaceAll(mapping.from, mapping.to);
            word = word.replaceAll(mapping.from.toLowerCase(), mapping.to.toLowerCase());
        });

        return word;
    }).join(" ");
}