// Conteúdo para: backend/src/utils/dateUtils.ts

/**
 * Converte uma string de data no formato "DD/MM/AAAA" para um objeto Date.
 * Retorna null se a string não for um formato de data válido.
 * @param dateString A string da data no formato "DD/MM/AAAA".
 * @returns Um objeto Date ou null.
 */
export const parseDateStringDMY = (dateString: string | undefined | null): Date | null => {
  if (!dateString) {
    return null;
  }

  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mês no JavaScript é 0-indexado (0-11)
    const year = parseInt(parts[2], 10);

    // Verifica se os números são válidos e se o ano tem 4 dígitos
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year.toString().length === 4 && day > 0 && day <= 31 && month >= 0 && month <= 11) {
      const date = new Date(year, month, day);
      // Verifica se a data criada é válida (ex: não cria 31/02/2023)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
  }
  console.warn(`Formato de data inválido recebido: ${dateString}. Esperado DD/MM/AAAA.`);
  return null; // Retorna null se o formato for inválido
};