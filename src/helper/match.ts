import * as similarity from 'string-similarity';
import { clean, removeSpecialChars } from './title';

const threshold = 0.9;

export function deepMatch(a, b, fuzzy = true) {
    let pass = false;

    a = a.toLowerCase();
    b = b.toLowerCase();

    if (fuzzy) {
        if (a.toLowerCase() === b.toLowerCase()) pass = true;
        else if (a.replaceAll("season", "").replaceAll("  ", " ").trimEnd() === clean(b).trimEnd()) pass = true;
        else if (similarity.compareTwoStrings(removeSpecialChars(a), b) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(a, removeSpecialChars(b)) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(removeSpecialChars(a), removeSpecialChars(b)) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(clean(a), b) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(a, clean(b)) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(clean(a), clean(b)) >= threshold) pass = true;
        else if (similarity.compareTwoStrings(clean(a).replaceAll(" ", ""), clean(b).replaceAll(" ", "")) >= threshold) pass = true;
    } else {
        if (a.toLowerCase() === b.toLowerCase()) pass = true;
        else if (a.replaceAll("season", "").replaceAll("  ", " ").trimEnd() === clean(b).trimEnd()) pass = true;
    }

    return pass;
}