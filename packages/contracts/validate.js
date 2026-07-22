function typeMatches(value,type){
  if(type==='null')return value===null;
  if(type==='array')return Array.isArray(value);
  if(type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(type==='integer')return Number.isInteger(value);
  if(type==='number')return typeof value==='number'&&Number.isFinite(value);
  return typeof value===type;
}

function checkFormat(value,format){
  if(format==='date-time')return !Number.isNaN(Date.parse(value))&&/T/.test(value);
  if(format==='uri'){try{const parsed=new URL(value);return !!parsed.protocol;}catch(error){return false;}}
  return true;
}

export function validateContract(schema,value,path='$'){
  const errors=[];
  const types=Array.isArray(schema.type)?schema.type:schema.type?[schema.type]:[];
  if(types.length&&!types.some(type=>typeMatches(value,type))){errors.push(`${path} must be ${types.join(' or ')}`);return errors;}
  if('const' in schema&&value!==schema.const)errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  if(schema.enum&&!schema.enum.includes(value))errors.push(`${path} must be one of ${schema.enum.join(', ')}`);
  if(typeof value==='string'){
    if(schema.minLength!==undefined&&value.length<schema.minLength)errors.push(`${path} is shorter than ${schema.minLength}`);
    if(schema.pattern&&!new RegExp(schema.pattern).test(value))errors.push(`${path} does not match ${schema.pattern}`);
    if(schema.format&&!checkFormat(value,schema.format))errors.push(`${path} is not a valid ${schema.format}`);
  }
  if(typeof value==='number'){
    if(schema.minimum!==undefined&&value<schema.minimum)errors.push(`${path} is below ${schema.minimum}`);
    if(schema.maximum!==undefined&&value>schema.maximum)errors.push(`${path} is above ${schema.maximum}`);
  }
  if(Array.isArray(value)){
    if(schema.minItems!==undefined&&value.length<schema.minItems)errors.push(`${path} has fewer than ${schema.minItems} items`);
    if(schema.items)value.forEach((item,index)=>errors.push(...validateContract(schema.items,item,`${path}[${index}]`)));
  }
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
    for(const required of schema.required||[])if(!(required in value))errors.push(`${path}.${required} is required`);
    const properties=schema.properties||{};
    for(const [key,item] of Object.entries(value)){
      if(properties[key])errors.push(...validateContract(properties[key],item,`${path}.${key}`));
      else if(schema.additionalProperties===false)errors.push(`${path}.${key} is not allowed`);
      else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')errors.push(...validateContract(schema.additionalProperties,item,`${path}.${key}`));
    }
  }
  return errors;
}

export function assertContract(schema,value,label=schema.title||'contract'){
  const errors=validateContract(schema,value);
  if(errors.length)throw new Error(`${label} failed validation:\n${errors.join('\n')}`);
  return value;
}
