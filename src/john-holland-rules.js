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
        // dataArray.forEach( item => {
        //     if (typeof item.Categories !== undefined) {
        //         console.log(item);
        //         let categories = item.Categories;
        //         aemTargetFolder = _getAemTargetFolderFromCategories(categories);
        //     }
        // })
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
    let priorityArray = [];
    let categorySeparator = ":";
    // Define the Canto Category metadata fields which will be used to set the aem_target_folder value
    // const projectCategory = "Projects";
    // const eventCategory = "Events";
    // const peopleByNameCategory = "People (by name)";
    // const peopleByRoleCategory = "People (by role)";

    const categoryByPriority = ["Projects", "Events", "People (by name)", "People (by role)"]

    if (typeof categoriesArray !== "undefined" && categoriesArray.length > 0) {
        categoriesArray.forEach( item => {
            let category = item.split(categorySeparator);
            console.log(category);
            // Todo: refactor this to check directly against category[1] instead of looping to see if we get a speedup. Likely too negligible.
            //for (let i = 1; i < category.length; i++) { // using oldschool for loop so I can `break`. i = 1 to skip the first $Categories value
                let categoryItem = category[1];
                // todo: work through why priority order isn't adhered to.
                //for (let j = 0; j < categoryByPriority.length; j++) {
                    if (path.length == 0 && categoryByPriority.indexOf(categoryItem) > -1) {
                        //set initial value if empty
                        path = _convertCategoryArrayToPath(category);
                    }else if ( categoryByPriority.indexOf(categoryItem) > -1 && categoryByPriority.indexOf(categoryItem) < categoryByPriority.indexOf(_getCategoryFromPath(path)) ) {
                        // if category is prioritised ahead of current category in the path
                        path = _convertCategoryArrayToPath(category);
                    } else if ( categoryByPriority.indexOf(categoryItem) > -1 && _convertCategoryArrayToPath(category).length > path.length && categoryByPriority.indexOf(categoryItem) == categoryByPriority.indexOf(_getCategoryFromPath(path)) ) {
                        // if we have multiple occurrences of the same category, select the longest
                        path = _convertCategoryArrayToPath(category);
                    }
                //}
            //
        })
    } else if (typeof categoriesArray !== "undefined") {
        path = _convertCategoryArrayToPath(categoriesArray);
    }

    return path;
}

function _convertCategoryArrayToPath(categoryArray) {
    let path = "";
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