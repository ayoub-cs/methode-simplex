// simplexMaximisation
function maximiserSimplex(nbDec, nbContr) {
  $("#valeursInput").hide();  

  var resultats = obtenirValeurs(nbDec, nbContr); 
  resultats.push(obtenirValeursFonction(nbDec, nbContr)); 

  var tableauFinal = []; 
  var compteurTableau = 0; 

  var iterMax = parseInt($("#iterMax").val()) || 20; 

  var variables = initialiserVariables(nbDec, nbContr);
  var variablesInitiales = variables[0];
  var typesVariables = variables[1];     

  var nbColonnes = nbDec + nbContr + 1;
  var nbLignes = nbContr + 1;


  var allVariables = ["Z"]; 
  for (let i = 1; i <= nbDec; i++) {
    allVariables.push("X" + i);
  }
  for (let i = 1; i <= nbContr; i++) {
    allVariables.push("E" + i);
  }

  convertirMatrice(resultats, "Initial", typesVariables, variablesInitiales, nbLignes, tableauFinal, compteurTableau, -1, -1, allVariables);

  
  compteurTableau++;

  do {
    // Find the column with the minimum value in the last row (objective row)
    var infoColonne = trouverColonneMin(resultats, nbLignes, nbColonnes);
    var valeurMin = infoColonne[0];
    if (valeurMin >= 0) break; // If no negative values, optimality is reached

    var colonneMin = infoColonne[1];

    // Determine the pivot row using the ratio test
    var resultatSortie = choisirSortie(resultats, colonneMin, nbColonnes, nbLignes, variablesInitiales);
    if (resultatSortie[0] === -1) break; // If no valid pivot row found, break the loop

    var lignePivot = resultatSortie[0];
    var colonnePivot = colonneMin;
    var valeurPivot = resultats[lignePivot][colonnePivot];

    // Normalize the pivot row and clear out the pivot column
    resultats = diviserLignePivot(resultats, nbColonnes, lignePivot, valeurPivot);
    resultats = annulerElementsColonne(resultats, lignePivot, colonnePivot, nbLignes, nbColonnes);

    // Update basic variables
    variablesInitiales[lignePivot] = "X" + (colonnePivot + 1);

    // Check if any negative values remain in the objective row
    var valeursZ = resultats[nbLignes - 1];
    var positifNegatif = valeursZ.some(v => v < 0);

    // Display the updated matrix
    convertirMatrice(resultats, "Partiel" + compteurTableau, typesVariables, variablesInitiales, nbLignes, tableauFinal, compteurTableau, lignePivot, colonnePivot, allVariables);

    compteurTableau++;
  } while (positifNegatif && compteurTableau < iterMax);

  // Display the final matrix with no pivot because it's the last one
  convertirMatrice(resultats, "Final", typesVariables, variablesInitiales, nbLignes, tableauFinal, compteurTableau, -1, -1, allVariables);
}




function initialiserVariables(nbDec, nbContr) {
  var base = ["Z"]; // Base starts with the objective function
  for (let i = 1; i <= nbContr; i++) {
      base.push("E" + i); // Adding slack variables as basic variables initially
  }

  var headers = ["Base"]; // Column for the basic variable names
  for (let i = 1; i <= nbDec; i++) {
      headers.push("X" + i); // Decision variables
  }
  for (let i = 1; i <= nbContr; i++) {
      headers.push("E" + i); // Slack variables
  }
  headers.push("="); // Right-hand side

  return [base, headers]; // Return both the list of basic variables and the headers for the tableau
}


function obtenirValeurs(nbDec, nbContr) {
  var valeurs = [];
  for (let i = 1; i <= nbContr; i++) {
    var ligne = [];
    for (let j = 1; j <= nbDec; j++) {
      var val = parseFloat($(`input[name='X${j}_res${i}']`).val()) || 0;
      ligne.push(val);
    }
    for (let j = 1; j <= nbContr; j++) {
      ligne.push(i === j ? 1 : 0);
    }
    var b = parseFloat($(`input[name='valRestriction${i}']`).val()) || 0;
    ligne.push(b);
    valeurs.push(ligne);
  }
  return valeurs;
}

function obtenirValeursFonction(nbDec, nbContr) {
  var fonctionZ = [];
  for (let i = 1; i <= nbDec; i++) {
    var val = parseFloat($(`input[name='valX${i}']`).val()) || 0;
    fonctionZ.push(-val); // Assuming maximization
  }
  for (let i = 0; i <= nbContr; i++) {
    fonctionZ.push(0);
  }
  return fonctionZ;
}

function convertirMatrice(matrice, nomDiv, tete, base, nbLignes, tableauFinal, aux, pivotRow, pivotCol, allVariables) {
  var html = `<div class="table-responsive"><table class="table table-bordered"><thead><tr>`;
  for (let i = 0; i < tete.length; i++) {
    html += `<th>${tete[i]}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (let i = 0; i < nbLignes; i++) {
    html += `<tr>`;
    for (let j = 0; j < matrice[i].length; j++) {
      let isPivot = i === pivotRow && j === pivotCol;
      let cellStyle = isPivot ? "style='background-color: yellow;'" : "";
      html += `<td ${cellStyle}>${matrice[i][j].toFixed(2)}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  // Calculate non-basic variables
  let nonBasicVariables = allVariables.filter(v => !base.includes(v));

  // Display current pivot information
  let pivotInfo = pivotRow !== -1 && pivotCol !== -1 ? `X${pivotCol + 1}` : "None";
  html += `<p>Vb: ${base.join(", ")}<br>VHB: ${nonBasicVariables.join(", ")}<br>Pivot: ${pivotInfo}</p>`;

  $("#resultats").append(html);
}


function trouverColonneMin(matrice, nbLignes, nbColonnes) {
  var rowIndex = nbLignes - 1;
  var min = matrice[rowIndex][0];
  var columnIndex = 0;
  for (let j = 1; j < nbColonnes - 1; j++) {
    if (matrice[rowIndex][j] < min) {
      min = matrice[rowIndex][j];
      columnIndex = j;
    }
  }
  return [min, columnIndex];
}

function choisirSortie(matrice, colonneMin, nbColonnes, nbLignes, variablesInitiales) {
  var minRatio = Infinity;
  var minRow = -1;
  for (let i = 0; i < nbLignes - 1; i++) {
    if (matrice[i][colonneMin] > 0) {
      var ratio = matrice[i][nbColonnes - 1] / matrice[i][colonneMin];
      if (ratio < minRatio) {
        minRatio = ratio;
        minRow = i;
      }
    }
  }
  if (minRow !== -1) {
    variablesInitiales[minRow] = "X" + (colonneMin + 1);
  }
  return [minRow, variablesInitiales];
}

function diviserLignePivot(matrice, nbColonnes, lignePivot, valeurPivot) {
  for (let j = 0; j < nbColonnes; j++) {
    matrice[lignePivot][j] /= valeurPivot;
  }
  return matrice;
}

function annulerElementsColonne(matrice, lignePivot, colonnePivot, nbLignes, nbColonnes) {
  for (let i = 0; i < nbLignes; i++) {
    if (i !== lignePivot) {
      let ratio = matrice[i][colonnePivot];
      for (let j = 0; j < nbColonnes; j++) {
        matrice[i][j] -= ratio * matrice[lignePivot][j];
      }
    }
  }
  return matrice;
}

function afficherResultats(matrice, nbDec, nbContr, nbColonnes, variablesInitiales) {
  var allVariables = ["Z"];
  for (let i = 1; i <= nbDec; i++) {
    allVariables.push("X" + i);
  }
  for (let i = 1; i <= nbContr; i++) {
    allVariables.push("E" + i);
  }

  var nonBasicVariables = allVariables.filter(v => !variablesInitiales.includes(v));

  var zValue = matrice[nbLignes - 1][nbColonnes - 1];
  $("#resultats").append(`<div>The optimal solution is Z = ${zValue.toFixed(2)}</div><br>`);
  $("#resultats").append("<div>Basic Variables: " + variablesInitiales.join(", ") + "</div>");
  $("#resultats").append("<div>Non-Basic Variables: " + nonBasicVariables.join(", ") + "</div><br>");
}

function cacherAfficher() {
  var tableau = $("#resultats");
  if (tableau.is(":visible")) {
    tableau.hide();
    $("#boutonAfficher").text('Afficher Tableau');
  } else {
    tableau.show();
    $("#boutonAfficher").text('Cacher Tableau');
  }
}
