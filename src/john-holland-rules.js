/*
 * John Holland temp rules until we have a better way of abstracting out.
 * Set aem_target_folder according to business rules for priorities of where the asset
 * should be saved in AEM, depending on the canto metadata values
 */

module.exports.setTargetFolder = function setTargetFolder(dataArray) {
    //console.log(dataArray);
    let aemTargetFolder = "";
    const johnHollandDamRoot = "/content/dam/john-holland";

    if (typeof dataArray !== "undefined" && dataArray.length > 0) {
        if (!Array.isArray(dataArray)) { // force as an array incase of single value so later forEach loops work
            dataArray = [dataArray];
        }
        let categoryAemPath = _getAemTargetFolderFromCategories(dataArray);
        if (categoryAemPath != "") {
            aemTargetFolder = johnHollandDamRoot + "/" + _getAemTargetFolderFromCategories(dataArray);
        }
    }

    return aemTargetFolder.toLowerCase();
}

function _getAemTargetFolderFromCategories(categoriesArray) {
    let path = "";
    let categorySeparator = ":";
    const categoryByPriority = ["Projects", "Events", "People (by name)", "People (by role)"]

    if (typeof categoriesArray !== "undefined" && categoriesArray.length > 0) {
        categoriesArray.forEach( item => {
            let category = item.split(categorySeparator);
            console.log(category);
            let categoryItem = category[1];

            if (path.length == 0 && categoryByPriority.indexOf(categoryItem) > -1) {
                // set initial value if empty
                path = _convertCategoryArrayToPath(category);
            }else if ( categoryByPriority.indexOf(categoryItem) > -1 && categoryByPriority.indexOf(categoryItem) < categoryByPriority.indexOf(_getCategoryFromPath(path)) ) {
                // if category is prioritised ahead of current category in the path
                path = _convertCategoryArrayToPath(category);
            } else if ( categoryByPriority.indexOf(categoryItem) > -1 && _convertCategoryArrayToPath(category).length > path.length && categoryByPriority.indexOf(categoryItem) == categoryByPriority.indexOf(_getCategoryFromPath(path)) ) {
                // if we have multiple occurrences of the same category, select the longest
                path = _convertCategoryArrayToPath(category);
            }
        })
    } else if (typeof categoriesArray !== "undefined") {
        path = _convertCategoryArrayToPath(categoriesArray);
    }

    return _renamePathFolder(unescape(path));
}

function _convertCategoryArrayToPath(categoryArray) {
    let path = "";
    categoryArray = _escapeCharsInArray(categoryArray);
    if (typeof categoryArray !== "undefined" && Array.isArray(categoryArray) && categoryArray.length > 0) { // handle multiple items in an array
        let arrayToString = categoryArray.slice(1, categoryArray.length).toString();
        path = arrayToString.replaceAll(",", "/");
    } else if(typeof categoryArray !== "undefined" && typeof categoryArray == "string") { // handle single string item
        let stringToArray = categoryArray.split(":");
        let arrayToString = stringToArray.slice(1, categoryArray.length).toString();
        path = arrayToString.replaceAll(",", "/");
    }

    return path;
}

function _getCategoryFromPath(path) {
    if (typeof path !== 'undefined' && path.indexOf("/") > 0) {
        return path.split("/")[0]
    } else if (path.length > 0 ) {
        return path; // Is a single root path with no child folders, so return
    } else {
        return "";
    }
}

/**
 *
 * To cover initial usecase of renaming `People (by role)` and `People (by name)` to `People`, but can be extended
 *
 */
function _renamePathFolder(path) {
    let renamedPath = "";
    const renamePeopleFrom = [ "People (by name)", "People (by role)"]
    const renamePeopleTo = "People"
    renamePeopleFrom.forEach( item => {
        if (path.indexOf(item) > -1) {
            renamedPath = path.replaceAll(item, renamePeopleTo);
        }
    })

    return renamedPath.length > 0 ? renamedPath : path;
}

function _escapeCharsInArray(array) {
    let escapedArray = [];

    array.forEach( item => {
        let escapedItem = escape(item);
        escapedArray.push(escapedItem);
    })

    return escapedArray;
}