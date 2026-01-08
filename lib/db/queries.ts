import { createClient } from '@/lib/supabase/server'

// Example: Fetch all rows from a table
export async function getTableData(tableName: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from(tableName).select('*')

  if (error) {
    console.error(`Error fetching data from ${tableName}:`, error)
    return null
  }

  return data
}

// Example: Insert data into a table
export async function insertData(tableName: string, data: any) {
  const supabase = await createClient()
  const { data: insertedData, error } = await supabase
    .from(tableName)
    .insert(data)
    .select()

  if (error) {
    console.error(`Error inserting data into ${tableName}:`, error)
    return null
  }

  return insertedData
}

// Example: Update data in a table
export async function updateData(
  tableName: string,
  id: string,
  updates: any
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error(`Error updating data in ${tableName}:`, error)
    return null
  }

  return data
}

// Example: Delete data from a table
export async function deleteData(tableName: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from(tableName).delete().eq('id', id)

  if (error) {
    console.error(`Error deleting data from ${tableName}:`, error)
    return false
  }

  return true
}
