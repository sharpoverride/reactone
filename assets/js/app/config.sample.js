var UE = UE || {};

UE.config = UE.config || {};

UE.config.fullMode = false;

//set the storage implementation module
UE.config.storage = 'StorageImplementation';
//set display limit of paragraph units
UE.config.defaultLimit = 5;
//set the default offset from where to get paragraph units
UE.config.defaultOffset = 0;

UE.config.baseUrl = 'http://localhost:3000/lue';
//UE.config.apiUrl = UE.config.baseUrl + '/api';
UE.config.apiUrl = 'http://localhost:3000/lue/api';
UE.config.onlyDocs = false;

//determin if we render tags with can hide property true
UE.config.renderCanHide = false;

//UE.config.initialData = simple_text_data;