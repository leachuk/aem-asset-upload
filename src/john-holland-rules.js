/*
 * John Holland temp rules until we have a better way of abstracting out.
 * Set aem_target_folder according to business rules for priorities of where the asset
 * should be saved in AEM, depending on the canto metadata values
 */

module.exports.setTargetFolder = function setTargetFolder(dataArray) {
    //console.log(dataArray);
    let aemTargetFolder = "";

    if (Array.isArray(dataArray) && dataArray.length > 0) {
        dataArray.forEach( item => {
            if (typeof item.Categories !== undefined) {
                console.log(item);
                let categories = item.Categories;
                aemTargetFolder = _getAemTargetFolderFromCategories(categories);
            }
        })
    }

    return aemTargetFolder;
}

function _getAemTargetFolderFromCategories(categoriesArray) {
    let path = "";
    let priorityArray = [];
    let categorySeparator = ":";
    // Define the Canto Category metadata fields which will be used to set the aem_target_folder value
    const projectCategory = "Projects";
    const eventCategory = "Events";
    const peopleByNameCategory = "People (by name)";
    const peopleByRoleCategory = "People (by role)";

    // todo: swap events and projects after testing
    const categoryByPriority = ["Projects", "Events", "People (by name)", "People (by role)"]

    if (Array.isArray(categoriesArray) && categoriesArray.length > 0) {
        categoriesArray.forEach( item => {
            let category = item.split(categorySeparator);
            console.log(category);
            // Todo: refactor this to check directly against category[1] instead of looping to see if we get a speedup. Likely too negligible.
            for (let i = 0; i < category.length; i++) { // using oldschool for loop so I can `break`
                let categoryItem = category[i];
                for (let j = 0; j < categoryByPriority.length; j++) {
                    if ( (priorityArray.length == 0 && categoryByPriority.indexOf(categoryItem) > -1) || (categoryByPriority.indexOf(categoryItem) > -1 && categoryByPriority.indexOf(categoryItem) < categoryByPriority.indexOf(_getCategoryFromPath(priorityArray[0]))) ) {
                        path = _convertCategoryArrayToPath(category);
                        priorityArray.unshift(path);
                        break;
                    }
                }
                // The order used here is important to define priorities.
                // Could be managed within a predefined array, but this is subjectively easier to read
                // if (categoryItem == eventCategory) {
                //     path = _convertCategoryArrayToPath(category);
                //     priorityArray.unshift(path);
                //     break;
                // } else if (categoryItem == projectCategory) {
                //     path = _convertCategoryArrayToPath(category);
                //     priorityArray.unshift(path);
                //     break;
                // } else if (categoryItem == peopleByNameCategory) {
                //     path = _convertCategoryArrayToPath(category);
                //     priorityArray.unshift(path);
                //     break;
                // } else if (categoryItem == peopleByRoleCategory) {
                //     path = _convertCategoryArrayToPath(category);
                //     priorityArray.unshift(path);
                //     break;
                // }
            }
        })
    }

    return path;
}

function _convertCategoryArrayToPath(categoryArray) {
    let path = "";
    if (Array.isArray(categoryArray) && categoryArray.length > 0) {
        let arrayToString = categoryArray.slice(1, categoryArray.length).toString();
        path = arrayToString.replaceAll(",", "/");
    }

    return path;
}

function _getCategoryFromPath(path) {
    if (typeof path !== 'undefined' && path.indexOf("/") > 0) {
        return path.split("/")[0]
    } else {
        return "";
    }

}