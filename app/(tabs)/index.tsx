import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const ITEMS_STORAGE_KEY = '@todo_items';
const CATEGORIES_STORAGE_KEY = '@todo_categories';

export default function App() {
  const [items, setItems] = useState([]); // items without category
  const [itemFormModalVisible, setItemFormModalVisible] = useState(false);
  const [itemDetailsModalVisible, setItemDetailsModalVisible] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryFormModalVisible, setCategoryFormModalVisible] = useState(false);

  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const initialItemState = {
    id: null,
    position: null,
    categoryId: null,
    title: '',
    description: '',
    desmarcarTipo: null,
    dayOfWeek: null,
    monthDayType: null,
    dayOfMonth: null,
    amountOfDays: '',
    isMarked: false,
    lastMarkedDate: null,
    nextUnmarkDate: null
  };

  const [itemFormState, setItemFormState] = useState(initialItemState);

  // Category Form State
  const initialCategoryState = {
    id: null,
    position: null,
    title: '',
    visible: true,
  };

  const [categoryFormState, setCategoryFormState] = useState(initialCategoryState);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log('ITEMS', items);
      console.log('CATEGORIES', categories);
    }
  }, [items, categories]);

  const loadItems = async () => {
    const categories = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
    const items = await AsyncStorage.getItem(ITEMS_STORAGE_KEY);
    if (items) setItems(JSON.parse(items));
    if (categories) setCategories(JSON.parse(categories));
  };

  const saveItems = async (newItems) => {
    await AsyncStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(newItems));
    setItems(newItems);
  };

  const saveCategories = async (newCategories) => {
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
    setCategories(newCategories);
  };

  const resetItemForm = () => {
    setItemFormState(initialItemState);
  };

  const resetCategoryForm = () => {
    setCategoryFormState(initialCategoryState);
  };

  const calculateNextUnmark = (state) => {
    const now = new Date();

    if (state.desmarcarTipo === 'cada semana') {
      let diff = (state.dayOfWeek + 7 - now.getDay()) % 7;
      if (diff === 0) diff = 7;
      now.setDate(now.getDate() + diff);
      return now.toISOString();
    }

    if (state.desmarcarTipo === 'cada mes') {
      let targetDate = new Date(now);

      if (state.monthDayType === 'inicio') {
        targetDate.setDate(1);
      } else if (state.monthDayType === 'segundo') {
        targetDate.setDate(2);
      } else if (state.monthDayType === 'ultimo') {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 0th day = last of prev month
      } else if (state.monthDayType === 'especifico') {
        targetDate.setDate(parseInt(state.dayOfMonth || '1'));
      } else {
        targetDate.setDate(1); // fallback
      }

      // If the target date is before or same as now, move to next month
      if (targetDate <= now) {
        if (state.monthDayType === 'ultimo') {
          targetDate = new Date(now.getFullYear(), now.getMonth() + 2, 0); // end of next month
        } else {
          targetDate.setMonth(targetDate.getMonth() + 1);
        }
      }

      return targetDate.toISOString();
    }

    if (state.desmarcarTipo === 'cada tantos días') {
      now.setDate(now.getDate() + parseInt(state.amountOfDays || '1'));
      return now.toISOString();
    }

    return null;
  };

  const handleItemSave = () => {
    const updatedState = {
      ...itemFormState,
      lastMarkedDate: itemFormState.isMarked ? new Date().toISOString() : null,
      nextUnmarkDate: itemFormState.isMarked ? calculateNextUnmark(itemFormState) : null
    };

    let newItems = [];
    if (itemFormState.id) {
      newItems = items.map(it => it.id === itemFormState.id ? updatedState : it);
    } else {
      updatedState.id = Date.now().toString();
      newItems = [...items, updatedState];
    }

    // After an item is created or updated
    // we need to update the categories
    // because we don't know which category was selected
    const newCategories = categoriesFromItems(newItems);
    const itemsWithoutCategory = newItems.filter(item => !item.categoryId);

    saveCategories(newCategories);
    saveItems(itemsWithoutCategory);
    resetItemForm();
    setItemFormModalVisible(false);
  };

  const categoriesFromItems = (items) => {
    return categories.map(category => {
      const itemsInCategory = items.filter(item => item.categoryId === category.id);
      return {
        ...category,
        items: itemsInCategory
      }
    })
  };

  const handleCategorySave = () => {
    let newCategories = [...categories]
    const updatedState = categoryFormState
    if (categoryFormState.id) {
      newCategories = categories.map(category => category.id === updatedState.id ? updatedState : category);
    } else {
      updatedState.id = Date.now().toString();
      newCategories = [...categories, updatedState];
    }

    saveCategories(newCategories)
    resetCategoryForm();
    setCategoryFormModalVisible(false);
  };

  const handleRemove = (id) => {
    const newItems = items.filter(it => it.id !== id);
    saveItems(newItems);
    resetItemForm();
    setItemDetailsModalVisible(false);
  };

  const toggleItemMark = (id) => {
    const newItems = items.map(it => {
      if (it.id === id) {
        const wasMarked = it.isMarked;
        const isNowMarked = !it.isMarked;
        return {
          ...it,
          isMarked: isNowMarked,
          lastMarkedDate: !wasMarked ? new Date().toISOString() : it.lastMarkedDate,
          nextUnmarkDate: isNowMarked ? calculateNextUnmark(it) : null
        };
      }
      return it;
    });
    saveItems(newItems);
  };

  const openItemDetailsModal = (item) => {
    setEditingItem(item);
    setItemFormModalVisible(false);
    setItemDetailsModalVisible(true);
  };

  const openItemFormModal = (item) => {
    setItemFormState({ ...item });
    setItemDetailsModalVisible(false);
    setItemFormModalVisible(true);
  };

  const openCategoryFormModal = (category) => {
    setCategoryFormState({ ...category });
    setCategoryFormModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Items without category */}
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TodoItem
            item={item}
            onToggleMark={() => toggleItemMark(item.id)}
            onView={() => openItemDetailsModal(item)}
          />
        )}
      />

      {categories.map(category => (
        <Category
          key={category.id}
          category={category}
          toggleItemMark={toggleItemMark}
          openItemDetailsModal={openItemDetailsModal}
        />
      ))}

      <ItemFormModal
        visible={itemFormModalVisible}
        onClose={() => { resetItemForm(); setItemFormModalVisible(false); }}
        itemFormState={itemFormState}
        setItemFormState={setItemFormState}
        onSave={handleItemSave}
      />

      <ItemDetailsModal
        visible={itemDetailsModalVisible}
        item={editingItem}
        onClose={() => setItemDetailsModalVisible(false)}
        onEdit={() => openItemFormModal(editingItem)}
      />

      <CategoryFormModal
        visible={categoryFormModalVisible}
        onClose={() => { resetCategoryForm(); setCategoryFormModalVisible(false); }}
        categoryFormState={categoryFormState}
        setCategoryFormState={setCategoryFormState}
        onSave={handleCategorySave}
      />

      <Button title="Añadir categoría" onPress={() => setCategoryFormModalVisible(true)} />
      <Button title="Añadir elemento" onPress={() => setItemFormModalVisible(true)} />

      {__DEV__ && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="🧹 Clear Data (DEV)"
            color="red"
            onPress={async () => {
              await AsyncStorage.removeItem(ITEMS_STORAGE_KEY);
              setItems([]);
              console.log('Data cleared');
            }}
          />
        </View>
      )}
    </View>
  );
}

const dateToHuman = (date) => {
  return new Date(date).toLocaleDateString('es-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

const TodoItem = ({ item, onToggleMark, onView }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onView}>
    <TouchableOpacity onPress={onToggleMark} style={styles.checkbox}>
      <Text>{item.isMarked ? '✅' : '⬜'}</Text>
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle}>{item.title || '(Sin título)'}</Text>
      <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
      {item.nextUnmarkDate && (
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.meta}>Se desmarcará el </Text>
          <Text style={{ fontSize: 10, color: '#999', fontWeight: 'bold'}}>{dateToHuman(item.lastMarkedDate)}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);


const Category = ({ category, toggleItemMark, openItemDetailsModal }) => (
  <View>
    <TouchableOpacity onPress={() => category.visible = !category.visible}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        {category.title}
      </Text>
      <FlatList
        data={category.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TodoItem
            item={item}
            onToggleMark={() => toggleItemMark(item.id)}
            onView={() => openItemDetailsModal(item)}
          />
        )}
      />
    </TouchableOpacity> 
  </View>
);

const ItemFormModal = ({ visible, onClose, itemFormState, setItemFormState, onSave }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <ScrollView>
          <Text style={styles.modalTitle}>{itemFormState.id ? 'Editar elemento' : 'Nuevo elemento'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Título (opcional)"
            value={itemFormState.title}
            onChangeText={text => setItemFormState({ ...itemFormState, title: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Descripción (opcional)"
            value={itemFormState.description}
            onChangeText={text => setItemFormState({ ...itemFormState, description: text })}
          />

          <Text style={styles.label}>¿Cuándo desmarcar?</Text>
          <Dropdown
            style={styles.dropdown}
            data={[
              { label: 'Manualmente', value: 'manual' },
              { label: 'Cada semana', value: 'cada semana' },
              { label: 'Cada mes', value: 'cada mes' },
              { label: 'Cada tantos días', value: 'cada tantos días' },
            ]}
            labelField="label"
            valueField="value"
            placeholder="Selecciona una opción"
            value={itemFormState.desmarcarTipo}
            onChange={item => {
              setItemFormState({ 
                ...itemFormState, 
                desmarcarTipo: item.value, 
                dayOfWeek: null, 
                amountOfDays: '' 
              });
            }}
          />

          {itemFormState.desmarcarTipo === 'cada semana' && (
            <>
              <Text style={styles.label}>Día de la semana</Text>
              <Dropdown
                style={styles.dropdown}
                data={[
                  { label: 'Lunes', value: 1 },
                  { label: 'Martes', value: 2 },
                  { label: 'Miércoles', value: 3 },
                  { label: 'Jueves', value: 4 },
                  { label: 'Viernes', value: 5 },
                  { label: 'Sábado', value: 6 },
                  { label: 'Domingo', value: 7 },
                ]}
                labelField="label"
                valueField="value"
                placeholder="Selecciona el día"
                value={itemFormState.dayOfWeek}
                onChange={item => setItemFormState({ ...itemFormState, dayOfWeek: item.value })}
              />
            </>
          )}

          {itemFormState.desmarcarTipo === 'cada mes' && (
            <>
              <Text style={styles.label}>Día del mes</Text>
              <Dropdown
                style={styles.dropdown}
                data={[
                  { label: 'Inicio del mes', value: 'inicio' },
                  { label: 'Segundo día del mes', value: 'segundo' },
                  { label: 'Último día del mes', value: 'ultimo' },
                  { label: 'Día específico', value: 'especifico' }
                ]}
                labelField="label"
                valueField="value"
                placeholder="Selecciona una opción"
                value={itemFormState.monthDayType}
                onChange={item => setItemFormState({
                  ...itemFormState,
                  monthDayType: item.value,
                  dayOfMonth: null // reset if switching
                })}
              />

              {itemFormState.monthDayType === 'especifico' && (
                <Dropdown
                  style={styles.dropdown}
                  data={Array.from({ length: 31 }, (_, i) => ({
                    label: `${i + 1}`,
                    value: (i + 1).toString()
                  }))}
                  labelField="label"
                  valueField="value"
                  placeholder="Selecciona el día"
                  value={itemFormState.dayOfMonth}
                  onChange={item => setItemFormState({ ...itemFormState, dayOfMonth: item.value })}
                />
              )}
            </>
          )}


          {itemFormState.desmarcarTipo === 'cada tantos días' && (
            <>
              <Text style={styles.label}>Número de días</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={itemFormState.amountOfDays}
                onChangeText={text => setItemFormState({ ...itemFormState, amountOfDays: text })}
                placeholder="Ej: 10"
              />
            </>
          )}

          <View>
            <Text style={styles.label}>Estado</Text>
            <TouchableOpacity onPress={() => setItemFormState({ ...itemFormState, isMarked: !itemFormState.isMarked })} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Text>{itemFormState.isMarked ? '✅ Marcado' : '⬜ Desmarcado'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <Button title="Guardar" onPress={onSave} />
            <Button title="Cancelar" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const CategoryFormModal = ({ visible, onClose, categoryFormState, setCategoryFormState, onSave }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <ScrollView>
          <Text style={styles.modalTitle}>{categoryFormState.id ? 'Editar categoría' : 'Nuevo categoría'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Título"
            value={categoryFormState.title}
            onChangeText={text => setCategoryFormState({ ...categoryFormState, title: text })}
          />

          <View style={styles.buttonRow}>
            <Button title="Guardar" onPress={onSave} />
            <Button title="Cancelar" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const ItemDetailsModal = ({ visible, item, onClose, onEdit }) => (
  <Modal visible={visible} animationType="fade" transparent={true}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {item && (
          <>
            <Text style={styles.modalTitle}>{item.title || '(Sin título)'}</Text>
            <Text style={{ marginBottom: 10 }}>{item.description}</Text>
            <Text style={styles.meta}>Desmarcar: {item.desmarcarTipo}</Text>
            <Text style={styles.meta}>Marcado: {item.lastMarkedDate ? new Date(item.lastMarkedDate).toLocaleString() : 'Nunca'}</Text>
            {item.nextUnmarkDate && (
              <Text style={styles.meta}>Próximo desmarque: {new Date(item.nextUnmarkDate).toLocaleString()}</Text>

            )}
            <View style={styles.buttonRow}>
              <Button title="Editar" onPress={onEdit} />
              <Button title="Cerrar" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </View>
  </Modal>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 50,
    paddingBottom: 100,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 40
  },
  itemTitle: {
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#666',
  },
  meta: {
    fontSize: 10,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    padding: 6,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  }
});
