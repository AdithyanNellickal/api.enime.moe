import * as similarity from 'string-similarity';
import { clean, removeSpecialChars } from './title';

const threshold = 0.85;

export function deepMatch(a, b) {
    let pass = false;

    if (a.toLowerCase() === b.toLowerCase()) pass = true;
    else if (similarity.compareTwoStrings(removeSpecialChars(a.toLowerCase()), b.toLowerCase()) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(a.toLowerCase(), removeSpecialChars(b.toLowerCase())) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(removeSpecialChars(a.toLowerCase()), removeSpecialChars(b.toLowerCase())) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(clean(a.toLowerCase()), b.toLowerCase()) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(a.toLowerCase(), clean(b.toLowerCase())) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(clean(a.toLowerCase()), clean(b.toLowerCase())) >= threshold) pass = true;
    else if (similarity.compareTwoStrings(clean(a.toLowerCase()).replaceAll(" ", ""), clean(b.toLowerCase()).replaceAll(" ", "")) >= threshold) pass = true;

    return pass;
}