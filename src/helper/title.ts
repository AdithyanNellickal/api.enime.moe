export function clean(title) {
    return title.replaceAll(/(th|rd|nd|st) (Season)/gmi, "").replaceAll(/\([^\(]*\)$/gmi, "").trimEnd();
}